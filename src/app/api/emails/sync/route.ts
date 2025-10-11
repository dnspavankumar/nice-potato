import { NextRequest, NextResponse } from 'next/server';
import { GmailService } from '@/lib/gmail';
import { GroqService } from '@/lib/groq';
import { VectorSearchService } from '@/lib/vector-search';
import { initializePineconeIndex } from '@/lib/pinecone';
import { config } from '@/lib/config';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('Received request body:', body);
    
    const { accessToken, refreshToken, query = '', maxResults = config.email.defaultMaxResults, senderEmail } = body;

    if (!accessToken) {
      console.log('Missing access token');
      return NextResponse.json(
        { error: 'Gmail access token is required' },
        { status: 400 }
      );
    }

    // Refresh token might be missing, but we can still try with just access token
    if (!refreshToken) {
      console.log('Warning: No refresh token available, using access token only');
    }

    // Initialize Pinecone index
    await initializePineconeIndex();

    // Initialize services
    const gmailService = new GmailService(accessToken, refreshToken);
    const groqService = new GroqService(config.groq.apiKey);
    const vectorService = new VectorSearchService();

    // Fetch emails from Gmail
    let emails;
    if (query) {
      console.log(`Fetching emails with custom query: ${query}`);
      emails = await gmailService.getEmails(query, maxResults);
    } else if (senderEmail) {
      console.log(`Fetching emails from sender: ${senderEmail}`);
      emails = await gmailService.getEmailsFromSender(senderEmail, maxResults);
    } else {
      console.log('Fetching latest 5 Canara Bank emails from Gmail...');
      emails = await gmailService.getCanaraEmails(maxResults);
    }
    
    if (emails.length === 0) {
      return NextResponse.json({
        message: 'No emails found',
        processed: 0,
      });
    }

    // Process emails with rate limiting
    const summaries: string[] = [];
    const processedEmails: Array<{
      id: string;
      subject: string;
      from: string;
      date: string;
      body: string;
      cc?: string;
    }> = [];
    const concurrencyLimit = config.groq.concurrencyLimit;
    
    console.log(`Processing ${emails.length} emails with concurrency limit of ${concurrencyLimit}...`);

    // Process emails in smaller concurrent batches
    for (let i = 0; i < emails.length; i += concurrencyLimit) {
      const batch = emails.slice(i, i + concurrencyLimit);
      
      const batchNumber = Math.floor(i / concurrencyLimit) + 1;
      const totalBatches = Math.ceil(emails.length / concurrencyLimit);
      
      console.log(`Processing batch ${batchNumber}/${totalBatches} (${batch.length} emails)`);
      console.log('Rate limit stats:', groqService.getRateLimitStats());
      
      // Process batch concurrently but with limited concurrency
      const batchPromises = batch.map(async (email) => {
        try {
          const summary = await groqService.summarizeEmail(
            email.from,
            email.cc,
            email.subject,
            email.date,
            email.body
          );
          return {
            email,
            summary: JSON.stringify(summary),
            success: true
          };
        } catch (error) {
          console.error(`Error summarizing email ${email.id}:`, error);
          return {
            email,
            summary: JSON.stringify({
              dateTime: email.date,
              sender: email.from,
              subject: email.subject,
              context: email.body.substring(0, 500),
            }),
            success: false
          };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      
      // Add results to arrays
      batchResults.forEach(result => {
        processedEmails.push(result.email);
        summaries.push(result.summary);
      });

      // Add a small delay between batches to be extra safe
      if (i + concurrencyLimit < emails.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    // Index emails in vector database
    console.log('Indexing emails in vector database...');
    await vectorService.indexEmails(processedEmails, summaries);

    return NextResponse.json({
      message: 'Emails synced successfully',
      processed: processedEmails.length,
      emails: processedEmails.map((email, index) => ({
        id: email.id,
        subject: email.subject,
        from: email.from,
        date: email.date,
        summary: summaries[index],
      })),
    });

  } catch (error) {
    console.error('Error syncing emails:', error);
    return NextResponse.json(
      { error: 'Failed to sync emails', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

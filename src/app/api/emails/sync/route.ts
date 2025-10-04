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
    
    const { accessToken, refreshToken, query = '', maxResults = 50 } = body;

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
    console.log('Fetching emails from Gmail...');
    const emails = await gmailService.getEmails(query, maxResults);
    
    if (emails.length === 0) {
      return NextResponse.json({
        message: 'No emails found',
        processed: 0,
      });
    }

    // Process emails in batches
    const batchSize = 10;
    const summaries: string[] = [];
    const processedEmails: any[] = [];

    for (let i = 0; i < emails.length; i += batchSize) {
      const batch = emails.slice(i, i + batchSize);
      const batchSummaries: string[] = [];

      // Generate summaries for the batch
      for (const email of batch) {
        try {
          const summary = await groqService.summarizeEmail(
            email.from,
            email.cc,
            email.subject,
            email.date,
            email.body
          );
          batchSummaries.push(JSON.stringify(summary));
        } catch (error) {
          console.error(`Error summarizing email ${email.id}:`, error);
          batchSummaries.push(JSON.stringify({
            dateTime: email.date,
            sender: email.from,
            subject: email.subject,
            context: email.body.substring(0, 500),
          }));
        }
      }

      summaries.push(...batchSummaries);
      processedEmails.push(...batch);
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

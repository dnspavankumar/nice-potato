import { NextRequest, NextResponse } from 'next/server';
import { GmailService } from '@/lib/gmail';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { accessToken, refreshToken, maxResults = 5 } = body;

    if (!accessToken) {
      return NextResponse.json(
        { error: 'Gmail access token is required' },
        { status: 400 }
      );
    }

    const gmailService = new GmailService(accessToken, refreshToken);
    
    console.log(`Fetching latest ${maxResults} Canara Bank emails...`);
    const emails = await gmailService.getCanaraEmails(maxResults);
    
    return NextResponse.json({
      message: `Found ${emails.length} Canara Bank emails`,
      count: emails.length,
      emails: emails.map(email => ({
        id: email.id,
        from: email.from,
        subject: email.subject,
        date: email.date,
        preview: email.body.substring(0, 200) + '...'
      }))
    });

  } catch (error) {
    console.error('Error fetching Canara Bank emails:', error);
    return NextResponse.json(
      { error: 'Failed to fetch Canara Bank emails', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
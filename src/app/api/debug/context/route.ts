import { NextRequest, NextResponse } from 'next/server';
import { VectorSearchService } from '@/lib/vector-search';

export async function POST(request: NextRequest) {
  try {
    const { query = "transaction amount" } = await request.json();
    
    console.log(`Debug context for query: "${query}"`);
    
    const vectorService = new VectorSearchService();
    const searchResults = await vectorService.searchEmails(query, 3);
    
    // Prepare context exactly like the chat API does
    const contextEmails = searchResults.map(result => {
      try {
        const summary = JSON.parse(result.metadata.summary);
        return `<Email Start>
Date and Time: ${summary.dateTime || result.metadata.date}
Sender: ${summary.sender || result.metadata.sender}
CC: ${summary.cc || 'None'}
Subject: ${summary.subject || result.metadata.subject}
Email Context: ${summary.context || 'No context available'}
<Email End>`;
      } catch {
        return `<Email Start>
Date and Time: ${result.metadata.date}
Sender: ${result.metadata.sender}
Subject: ${result.metadata.subject}
Email Context: ${result.metadata.summary}
<Email End>`;
      }
    });
    
    return NextResponse.json({
      query,
      searchResultsCount: searchResults.length,
      searchResults: searchResults.map(result => ({
        id: result.id,
        score: result.score,
        metadata: result.metadata
      })),
      contextEmails,
      status: 'success'
    });
    
  } catch (error) {
    console.error('Debug context error:', error);
    return NextResponse.json(
      { 
        error: 'Debug context failed', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}
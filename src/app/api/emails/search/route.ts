import { NextRequest, NextResponse } from 'next/server';
import { VectorSearchService } from '@/lib/vector-search';

export async function POST(request: NextRequest) {
  try {
    const { query, sender, startDate, endDate, topK = 25 } = await request.json();

    if (!query) {
      return NextResponse.json(
        { error: 'Search query is required' },
        { status: 400 }
      );
    }

    const vectorService = new VectorSearchService();
    let searchResults;

    // Apply filters based on provided parameters
    if (sender && startDate && endDate) {
      // Search with all filters
      searchResults = await vectorService.searchEmails(query, topK, {
        from: sender,
        date: {
          $gte: startDate,
          $lte: endDate,
        },
      });
    } else if (sender) {
      // Search by sender
      searchResults = await vectorService.searchEmailsBySender(query, sender, topK);
    } else if (startDate && endDate) {
      // Search by date range
      searchResults = await vectorService.searchEmailsByDateRange(query, startDate, endDate, topK);
    } else {
      // General search
      searchResults = await vectorService.searchEmails(query, topK);
    }

    return NextResponse.json({
      results: searchResults.map(result => ({
        id: result.metadata.emailId,
        subject: result.metadata.subject,
        sender: result.metadata.sender,
        date: result.metadata.date,
        summary: result.metadata.summary,
        score: result.score,
      })),
      total: searchResults.length,
    });

  } catch (error) {
    console.error('Error searching emails:', error);
    return NextResponse.json(
      { error: 'Failed to search emails', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

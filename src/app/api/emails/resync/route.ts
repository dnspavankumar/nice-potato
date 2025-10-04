import { NextRequest, NextResponse } from 'next/server';
import { getPineconeIndex } from '@/lib/pinecone';

export async function POST(request: NextRequest) {
  try {
    const { confirm = false } = await request.json();
    
    if (!confirm) {
      return NextResponse.json({
        message: 'This will clear all existing email data and require a fresh sync. Send {"confirm": true} to proceed.',
        warning: 'All existing email vectors will be deleted from Pinecone.'
      });
    }
    
    console.log('Clearing existing email data from Pinecone...');
    
    const index = await getPineconeIndex();
    
    // Delete all vectors in the index
    await index.deleteAll();
    
    console.log('All email data cleared. Please sync your emails again.');
    
    return NextResponse.json({
      message: 'Email data cleared successfully. Please use the "Sync Emails" button to re-sync with improved summaries.',
      status: 'success'
    });
    
  } catch (error) {
    console.error('Error clearing email data:', error);
    return NextResponse.json(
      { 
        error: 'Failed to clear email data', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}
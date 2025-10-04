import { NextRequest, NextResponse } from 'next/server';
import { getPineconeIndex } from '@/lib/pinecone';

export async function POST(request: NextRequest) {
  try {
    const { emailId = "199a97ef162a655b" } = await request.json();
    
    console.log(`Fetching email details for: ${emailId}`);
    
    const index = await getPineconeIndex();
    const fetchResponse = await index.fetch([emailId]);
    
    if (!fetchResponse.vectors || !fetchResponse.vectors[emailId]) {
      return NextResponse.json({
        error: 'Email not found',
        emailId
      }, { status: 404 });
    }
    
    const vector = fetchResponse.vectors[emailId];
    
    return NextResponse.json({
      emailId,
      metadata: vector.metadata,
      vectorDimension: vector.values?.length || 0,
      status: 'success'
    });
    
  } catch (error) {
    console.error('Debug email error:', error);
    return NextResponse.json(
      { 
        error: 'Debug email failed', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}
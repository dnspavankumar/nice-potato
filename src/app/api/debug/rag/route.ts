import { NextRequest, NextResponse } from 'next/server';
import { VectorSearchService } from '@/lib/vector-search';
import { generateEmbedding } from '@/lib/embeddings';
import { getPineconeIndex } from '@/lib/pinecone';

export async function POST(request: NextRequest) {
  try {
    const { query = "account balance" } = await request.json();
    
    console.log(`Debug RAG pipeline for query: "${query}"`);
    
    // Step 1: Check Pinecone index status
    const index = await getPineconeIndex();
    const stats = await index.describeIndexStats();
    
    console.log('Pinecone stats:', stats);
    
    // Step 2: Generate embedding for query
    console.log('Generating query embedding...');
    const queryEmbedding = await generateEmbedding(query);
    console.log(`Query embedding generated: ${queryEmbedding.length} dimensions`);
    
    // Step 3: Search for similar vectors
    console.log('Searching for similar vectors...');
    const vectorService = new VectorSearchService();
    const searchResults = await vectorService.searchEmails(query, 10);
    
    console.log(`Found ${searchResults.length} results`);
    
    // Step 4: Get some sample vectors from index
    console.log('Fetching sample vectors...');
    const listResponse = await index.listPaginated({ limit: 5 });
    const vectorIds = listResponse.vectors?.map(v => v.id) || [];
    
    let sampleVectors = [];
    if (vectorIds.length > 0) {
      const fetchResponse = await index.fetch(vectorIds);
      sampleVectors = Object.entries(fetchResponse.vectors || {}).map(([id, vector]) => ({
        id,
        metadata: vector.metadata
      }));
    }
    
    return NextResponse.json({
      query,
      indexStats: {
        totalVectorCount: stats.totalVectorCount,
        dimension: stats.dimension,
      },
      queryEmbedding: {
        length: queryEmbedding.length,
        sample: queryEmbedding.slice(0, 5), // First 5 values
      },
      searchResults: searchResults.map(result => ({
        id: result.id,
        score: result.score,
        metadata: {
          subject: result.metadata.subject,
          sender: result.metadata.sender,
          date: result.metadata.date,
        }
      })),
      sampleVectors,
      status: 'success'
    });
    
  } catch (error) {
    console.error('Debug RAG error:', error);
    return NextResponse.json(
      { 
        error: 'Debug RAG failed', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}
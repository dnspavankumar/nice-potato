import { NextResponse } from 'next/server';
import { getPineconeClient } from '@/lib/pinecone';
import { config } from '@/lib/config';

export async function GET() {
  try {
    const client = await getPineconeClient();
    
    // List all indexes
    const existingIndexes = await client.listIndexes();
    
    // Check if our index exists
    const ourIndex = existingIndexes.indexes?.find(
      index => index.name === config.pinecone.indexName
    );
    
    if (!ourIndex) {
      return NextResponse.json({
        status: 'index_not_found',
        indexName: config.pinecone.indexName,
        message: 'Index does not exist. Run the reset script to create it.',
        availableIndexes: existingIndexes.indexes?.map(i => i.name) || []
      });
    }
    
    // Get index stats
    const index = client.index(config.pinecone.indexName);
    const stats = await index.describeIndexStats();
    
    return NextResponse.json({
      status: 'healthy',
      indexName: config.pinecone.indexName,
      dimension: ourIndex.dimension,
      expectedDimension: config.vector.embeddingDimension,
      dimensionMatch: ourIndex.dimension === config.vector.embeddingDimension,
      vectorCount: stats.totalVectorCount || 0,
      indexInfo: {
        host: ourIndex.host,
        metric: ourIndex.metric,
        cloud: ourIndex.cloud,
        region: ourIndex.region,
      },
      embeddingModel: 'custom (1024 dimensions)'
    });
    
  } catch (error) {
    return NextResponse.json(
      { 
        status: 'error', 
        error: 'Failed to get Pinecone status', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}
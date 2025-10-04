import { NextResponse } from 'next/server';
import { getPineconeClient } from '@/lib/pinecone';
import { config } from '@/lib/config';

export async function POST() {
  try {
    const client = await getPineconeClient();
    
    console.log('Checking existing indexes...');
    const existingIndexes = await client.listIndexes();
    
    const indexExists = existingIndexes.indexes?.some(
      index => index.name === config.pinecone.indexName
    );
    
    if (indexExists) {
      console.log(`Deleting existing index: ${config.pinecone.indexName}`);
      await client.deleteIndex(config.pinecone.indexName);
      
      // Wait a bit for deletion to complete
      console.log('Waiting for index deletion to complete...');
      await new Promise(resolve => setTimeout(resolve, 10000));
    }
    
    console.log(`Creating new index: ${config.pinecone.indexName}`);
    await client.createIndex({
      name: config.pinecone.indexName,
      dimension: config.vector.embeddingDimension, // 1024
      metric: 'cosine',
      spec: {
        serverless: {
          cloud: 'aws',
          region: 'us-east-1'
        }
      },
      waitUntilReady: true,
    });
    
    return NextResponse.json({
      message: 'Index reset successfully',
      indexName: config.pinecone.indexName,
      dimension: config.vector.embeddingDimension,
      status: 'success'
    });
    
  } catch (error) {
    console.error('Error resetting Pinecone index:', error);
    return NextResponse.json(
      { 
        error: 'Failed to reset Pinecone index', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}
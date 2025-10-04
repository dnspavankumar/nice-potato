import { getPineconeClient } from '../lib/pinecone';
import { config } from '../lib/config';

async function resetPineconeIndex() {
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
    
    console.log('✅ Index created successfully with 1024 dimensions!');
    console.log('You can now sync your emails without dimension mismatch errors.');
    
  } catch (error) {
    console.error('❌ Error resetting Pinecone index:', error);
  }
}

// Run the script
resetPineconeIndex();
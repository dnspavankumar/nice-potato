import { Pinecone } from '@pinecone-database/pinecone';
import { config } from './config';

let pinecone: Pinecone | null = null;

export const getPineconeClient = async () => {
  if (!pinecone) {
    pinecone = new Pinecone({
      apiKey: config.pinecone.apiKey,
    });
  }
  return pinecone;
};

export const getPineconeIndex = async () => {
  const client = await getPineconeClient();
  return client.index(config.pinecone.indexName);
};

export const initializePineconeIndex = async () => {
  try {
    const client = await getPineconeClient();
    
    // Check if index exists
    const existingIndexes = await client.listIndexes();
    const indexExists = existingIndexes.indexes?.some(
      index => index.name === config.pinecone.indexName
    );
    
    if (!indexExists) {
      // Create index with integrated embedding model
      await client.createIndexForModel({
        name: config.pinecone.indexName,
        cloud: 'aws',
        region: 'us-east-1',
        embed: {
          model: 'llama-text-embed-v2',
          fieldMap: { text: 'chunk_text' },
        },
        waitUntilReady: true,
      });
      
      console.log(`Created Pinecone index with integrated embedding model: ${config.pinecone.indexName}`);
    } else {
      console.log(`Pinecone index already exists: ${config.pinecone.indexName}`);
    }
    
    return true;
  } catch (error) {
    console.error('Error initializing Pinecone index:', error);
    throw error;
  }
};

// Updated to work with integrated embedding models
export const upsertTexts = async (texts: Array<{
  id: string;
  values: number[];
  metadata: Record<string, any>;
}>) => {
  try {
    const index = await getPineconeIndex();
    await index.upsert(texts);
    console.log(`Upserted ${texts.length} text chunks to Pinecone`);
  } catch (error) {
    console.error('Error upserting texts:', error);
    throw error;
  }
};

// Search with vectors
export const searchVectors = async (
  queryVector: number[],
  topK: number = config.vector.topK,
  filter?: Record<string, any>
) => {
  try {
    const index = await getPineconeIndex();
    const searchResponse = await index.query({
      vector: queryVector,
      topK,
      includeMetadata: true,
      filter,
    });
    
    return searchResponse.matches || [];
  } catch (error) {
    console.error('Error searching vectors:', error);
    throw error;
  }
};

export const deleteVectors = async (ids: string[]) => {
  try {
    const index = await getPineconeIndex();
    await index.deleteMany(ids);
    console.log(`Deleted ${ids.length} vectors from Pinecone`);
  } catch (error) {
    console.error('Error deleting vectors:', error);
    throw error;
  }
};

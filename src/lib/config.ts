export const config = {
  // Pinecone Configuration
  pinecone: {
    apiKey: process.env.PINECONE_API_KEY!,
    indexName: process.env.PINECONE_INDEX_NAME || 'emailrag-index',
  },
  
  // Groq Configuration
  groq: {
    apiKey: process.env.GROQ_API_KEY!,
    model: 'llama-3.3-70b-versatile',
    temperature: 0.3,
    maxTokens: 1000,
  },
  
  // Gmail Configuration
  gmail: {
    scopes: ['https://www.googleapis.com/auth/gmail.readonly'],
    clientId: process.env.GOOGLE_CLIENT_ID!,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
  },
  
  // Vector Search Configuration
  vector: {
    embeddingDimension: 1536,
    topK: 25,
    similarityThreshold: 0.7,
  },
  
  // Email Processing
  email: {
    maxEmailsPerBatch: 50,
    supportedMimeTypes: ['text/plain', 'text/html'],
    maxBodyLength: 10000,
  },
} as const;

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
    rateLimitDelay: 1000, // 1 second between requests
    maxRetries: 3,
    concurrencyLimit: 3, // Max concurrent requests
  },
  
  // Gmail Configuration
  gmail: {
    scopes: ['https://www.googleapis.com/auth/gmail.readonly'],
    clientId: process.env.GOOGLE_CLIENT_ID!,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
  },
  
  // Vector Search Configuration
  vector: {
    embeddingDimension: 1024, // Changed to match Pinecone index dimension (llama-text-embed-v2)
    topK: 25,
    similarityThreshold: 0.7,
  },
  
  // Email Processing
  email: {
    maxEmailsPerBatch: 5, // Reduced to 5 for Canara Bank focus
    supportedMimeTypes: ['text/plain', 'text/html'],
    maxBodyLength: 10000,
    defaultMaxResults: 5, // Default to 5 recent emails
  },
} as const;

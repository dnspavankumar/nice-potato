import { config } from './config';

// Simple but functional text embedding using TF-IDF-like approach
export const generateEmbedding = async (text: string): Promise<number[]> => {
  try {
    // Create a simple but functional embedding based on text characteristics
    const cleanText = text.toLowerCase().replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim();
    const words = cleanText.split(' ').filter(word => word.length > 2);
    
    // Create a deterministic embedding based on text content
    const embedding = new Array(config.vector.embeddingDimension).fill(0);
    
    // Use word hashing and frequency to create meaningful embeddings
    words.forEach((word) => {
      const hash = simpleHash(word);
      const freq = words.filter(w => w === word).length / words.length;
      
      // Distribute word influence across multiple dimensions
      for (let i = 0; i < 10; i++) {
        const dim = (hash + i * 37) % config.vector.embeddingDimension;
        embedding[dim] += freq * Math.sin(hash + i) * 0.1;
      }
    });
    
    // Add semantic features for banking terms
    const bankingTerms = [
      'transaction', 'balance', 'account', 'payment', 'transfer', 'deposit', 
      'withdrawal', 'credit', 'debit', 'bank', 'canara', 'amount', 'rupees',
      'upi', 'imps', 'neft', 'rtgs', 'atm', 'card', 'loan', 'interest'
    ];
    
    bankingTerms.forEach((term, index) => {
      if (cleanText.includes(term)) {
        const termDim = (100 + index * 13) % config.vector.embeddingDimension;
        embedding[termDim] += 0.5; // Boost banking-related dimensions
      }
    });
    
    // Add positional and length features
    const textLength = Math.min(text.length / 1000, 1); // Normalize length
    embedding[0] = textLength;
    embedding[1] = words.length / 100; // Word count feature
    
    // Normalize the embedding vector
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    if (magnitude > 0) {
      for (let i = 0; i < embedding.length; i++) {
        embedding[i] = embedding[i] / magnitude;
      }
    }
    
    return embedding;
  } catch (error) {
    console.error('Error generating embedding:', error);
    // Fallback to a simple hash-based embedding
    return generateFallbackEmbedding(text);
  }
};

// Simple hash function for consistent word mapping
function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

// Fallback embedding generation
function generateFallbackEmbedding(text: string): number[] {
  const embedding = new Array(config.vector.embeddingDimension).fill(0);
  const hash = simpleHash(text);
  
  // Create a deterministic but varied embedding
  for (let i = 0; i < config.vector.embeddingDimension; i++) {
    embedding[i] = Math.sin(hash + i * 0.1) * 0.1;
  }
  
  return embedding;
}

export const generateEmbeddings = async (texts: string[]): Promise<number[][]> => {
  try {
    const embeddings = await Promise.all(
      texts.map(text => generateEmbedding(text))
    );
    return embeddings;
  } catch (error) {
    console.error('Error generating embeddings:', error);
    throw error;
  }
};

// Clean and prepare text for embedding
export const prepareTextForEmbedding = (text: string): string => {
  return text
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .replace(/\n+/g, ' ') // Replace newlines with spaces
    .trim()
    .substring(0, 8000); // Limit length for embedding models
};

import { config } from './config';

// For now, we'll use a simple text embedding approach
// In production, you should use a proper embedding model like OpenAI's text-embedding-ada-002
export const generateEmbedding = async (text: string): Promise<number[]> => {
  try {
    // TODO: Replace with actual embedding API call
    // For now, return a random vector for testing
    // In production, use OpenAI or another embedding service:
    /*
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: text,
        model: 'text-embedding-ada-002',
      }),
    });
    
    const data = await response.json();
    return data.data[0].embedding;
    */
    
    // Temporary: Generate random embedding for testing
    const embedding = Array.from({ length: config.vector.embeddingDimension }, () => 
      Math.random() * 2 - 1
    );
    
    return embedding;
  } catch (error) {
    console.error('Error generating embedding:', error);
    throw error;
  }
};

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

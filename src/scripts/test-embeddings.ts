import { generateEmbedding } from '../lib/embeddings';
import { config } from '../lib/config';

async function testEmbeddings() {
  try {
    console.log('Testing embedding generation...');
    
    const testText = "This is a test email from Canara Bank about account balance.";
    const embedding = await generateEmbedding(testText);
    
    console.log(`✅ Generated embedding with ${embedding.length} dimensions`);
    console.log(`Expected dimensions: ${config.vector.embeddingDimension}`);
    console.log(`Dimensions match: ${embedding.length === config.vector.embeddingDimension}`);
    
    // Show first few values
    console.log(`First 5 values: [${embedding.slice(0, 5).map(v => v.toFixed(4)).join(', ')}...]`);
    
    if (embedding.length === config.vector.embeddingDimension) {
      console.log('🎉 Embeddings are working correctly!');
    } else {
      console.log('❌ Dimension mismatch detected!');
    }
    
  } catch (error) {
    console.error('❌ Error testing embeddings:', error);
  }
}

// Run the test
testEmbeddings();
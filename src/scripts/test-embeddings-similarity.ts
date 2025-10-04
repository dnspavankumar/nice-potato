import { generateEmbedding } from '../lib/embeddings';

async function testEmbeddingSimilarity() {
  try {
    console.log('Testing embedding similarity...');
    
    // Test texts with different levels of similarity
    const texts = [
      "Your account balance is Rs 5000. Recent transaction: debit of Rs 500.",
      "Account balance: Rs 5000. Last transaction: Rs 500 debited from your account.",
      "Canara Bank transaction alert: Rs 1000 credited to your account.",
      "Weather forecast for today: sunny with a chance of rain.",
      "Your UPI payment of Rs 200 to merchant was successful."
    ];
    
    console.log('Generating embeddings...');
    const embeddings = await Promise.all(texts.map(text => generateEmbedding(text)));
    
    // Calculate cosine similarity between embeddings
    function cosineSimilarity(a: number[], b: number[]): number {
      const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
      const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
      const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
      return dotProduct / (magnitudeA * magnitudeB);
    }
    
    console.log('\nSimilarity Matrix:');
    console.log('Text 1: Account balance Rs 5000, debit Rs 500');
    console.log('Text 2: Account balance Rs 5000, Rs 500 debited (similar to 1)');
    console.log('Text 3: Canara Bank Rs 1000 credited (banking related)');
    console.log('Text 4: Weather forecast (unrelated)');
    console.log('Text 5: UPI payment Rs 200 (banking related)');
    console.log('');
    
    for (let i = 0; i < texts.length; i++) {
      for (let j = i + 1; j < texts.length; j++) {
        const similarity = cosineSimilarity(embeddings[i], embeddings[j]);
        console.log(`Text ${i + 1} vs Text ${j + 1}: ${similarity.toFixed(3)}`);
      }
    }
    
    // Test banking term detection
    console.log('\nBanking term detection test:');
    const bankingText = "Canara Bank transaction alert: Rs 1000 credited to your account via UPI";
    const nonBankingText = "The weather is nice today and I went for a walk in the park";
    
    const bankingEmbedding = await generateEmbedding(bankingText);
    const nonBankingEmbedding = await generateEmbedding(nonBankingText);
    
    const bankingSimilarity = cosineSimilarity(bankingEmbedding, embeddings[0]); // Compare with first banking text
    const nonBankingSimilarity = cosineSimilarity(nonBankingEmbedding, embeddings[0]);
    
    console.log(`Banking text similarity to account balance text: ${bankingSimilarity.toFixed(3)}`);
    console.log(`Non-banking text similarity to account balance text: ${nonBankingSimilarity.toFixed(3)}`);
    
    if (bankingSimilarity > nonBankingSimilarity) {
      console.log('✅ Embeddings correctly identify banking-related content as more similar!');
    } else {
      console.log('❌ Embeddings may need improvement for banking content detection.');
    }
    
  } catch (error) {
    console.error('❌ Error testing embeddings:', error);
  }
}

// Run the test
testEmbeddingSimilarity();
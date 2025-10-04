import { VectorSearchService } from '../lib/vector-search';
import { generateEmbedding } from '../lib/embeddings';
import { getPineconeIndex } from '../lib/pinecone';

async function testIndexing() {
  try {
    console.log('Testing email indexing process...');
    
    // Create a test email
    const testEmail = {
      id: 'test-email-123',
      from: 'canarabank@canarabank.com',
      subject: 'ATM/IMPS/UPI Transaction Alert',
      date: '2025-10-05T10:00:00Z',
      body: 'Your account has been debited with Rs 500 for UPI transaction to merchant XYZ on 05-Oct-2025.',
      cc: undefined
    };
    
    const testSummary = JSON.stringify({
      dateTime: '05-Oct-2025 10:00',
      sender: 'canarabank@canarabank.com',
      subject: 'ATM/IMPS/UPI Transaction Alert',
      context: 'Account debited Rs 500 for UPI transaction to merchant XYZ'
    });
    
    console.log('1. Testing embedding generation...');
    const embedding = await generateEmbedding(testEmail.body);
    console.log(`✅ Embedding generated: ${embedding.length} dimensions`);
    
    console.log('2. Testing vector search service...');
    const vectorService = new VectorSearchService();
    
    try {
      await vectorService.indexEmail(testEmail, testSummary);
      console.log('✅ Email indexed successfully');
    } catch (error) {
      console.error('❌ Indexing failed:', error);
      return;
    }
    
    console.log('3. Checking Pinecone index...');
    const index = await getPineconeIndex();
    const stats = await index.describeIndexStats();
    console.log(`Index stats: ${stats.totalVectorCount} vectors`);
    
    console.log('4. Testing search...');
    const searchResults = await vectorService.searchEmails('UPI transaction', 5);
    console.log(`Search results: ${searchResults.length} found`);
    
    if (searchResults.length > 0) {
      console.log('✅ Search working correctly');
      searchResults.forEach((result, i) => {
        console.log(`  ${i + 1}. ${result.metadata.subject} (score: ${result.score})`);
      });
    } else {
      console.log('❌ Search returned no results');
    }
    
    console.log('5. Cleaning up test data...');
    await vectorService.deleteEmail('test-email-123');
    console.log('✅ Test completed');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testIndexing();
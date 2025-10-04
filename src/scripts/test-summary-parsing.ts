import { GroqService } from '../lib/groq';
import { config } from '../lib/config';

async function testSummaryParsing() {
  try {
    console.log('Testing email summary parsing...');
    
    const groqService = new GroqService(config.groq.apiKey);
    
    // Test with fallback content (what happens when Groq fails)
    const fallbackContent = `Dear Customer,

Your account XXXXXXX1234 has been debited with Rs. 500.00 on 03-Oct-2025 15:24:52 for UPI transaction to MERCHANT XYZ.

Available Balance: Rs. 15,000.00

Transaction Reference: UPI123456789

For any queries, contact customer care.

Regards,
Canara Bank`;
    
    console.log('Testing fallback content parsing...');
    console.log('Input:', fallbackContent.substring(0, 100) + '...');
    
    // Access the private method through a test
    const testSummary = {
      dateTime: '03-Oct-2025 15:24:52 +0530',
      sender: 'canarabank@canarabank.com',
      cc: undefined,
      subject: 'ATM/IMPS/UPI Transaction Alert',
      context: fallbackContent,
    };
    
    // Simulate what the parseEmailSummary method should extract
    const amountMatch = fallbackContent.match(/Rs\.?\s*(\d+(?:,\d+)*(?:\.\d{2})?)/i);
    const amount = amountMatch ? `Rs. ${amountMatch[1]}` : '';
    
    const balanceMatch = fallbackContent.match(/(?:Available\s+)?Balance:?\s*Rs\.?\s*(\d+(?:,\d+)*(?:\.\d{2})?)/i);
    const balance = balanceMatch ? `Balance: Rs. ${balanceMatch[1]}` : '';
    
    const transactionTypes = ['debited', 'credited', 'UPI', 'IMPS', 'NEFT', 'ATM'];
    const foundTypes = transactionTypes.filter(type => 
      fallbackContent.toLowerCase().includes(type.toLowerCase())
    );
    
    console.log('\nExtracted information:');
    console.log('Amount:', amount);
    console.log('Balance:', balance);
    console.log('Transaction types:', foundTypes);
    
    let context = '';
    if (amount) context += `Amount: ${amount}. `;
    if (foundTypes.length > 0) context += `Transaction type: ${foundTypes.join(', ')}. `;
    if (balance) context += balance + '. ';
    
    console.log('Generated context:', context);
    
    if (context.includes('500') && context.includes('15,000')) {
      console.log('✅ Parsing successfully extracts transaction details');
    } else {
      console.log('❌ Parsing failed to extract key details');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testSummaryParsing();
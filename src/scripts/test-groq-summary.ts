import { GroqService } from '../lib/groq';
import { config } from '../lib/config';

async function testGroqSummary() {
  try {
    console.log('Testing Groq email summarization...');
    
    const groqService = new GroqService(config.groq.apiKey);
    
    // Test with a sample email
    const testEmail = {
      from: 'canarabank@canarabank.com',
      cc: undefined,
      subject: 'ATM/IMPS/UPI Transaction Alert',
      date: 'Fri, 03 Oct 2025 15:24:52 +0530',
      body: `Dear Customer,

Your account XXXXXXX1234 has been debited with Rs. 500.00 on 03-Oct-2025 15:24:52 for UPI transaction to MERCHANT XYZ.

Available Balance: Rs. 15,000.00

Transaction Reference: UPI123456789

For any queries, contact customer care.

Regards,
Canara Bank`
    };
    
    console.log('Input email:');
    console.log('From:', testEmail.from);
    console.log('Subject:', testEmail.subject);
    console.log('Body:', testEmail.body.substring(0, 200) + '...');
    
    console.log('\nCalling Groq API...');
    const summary = await groqService.summarizeEmail(
      testEmail.from,
      testEmail.cc,
      testEmail.subject,
      testEmail.date,
      testEmail.body
    );
    
    console.log('\nGroq Summary Result:');
    console.log(JSON.stringify(summary, null, 2));
    
    // Test if the summary contains useful information
    if (summary.context && summary.context !== '<Email End>' && summary.context.length > 10) {
      console.log('✅ Summary contains useful context');
    } else {
      console.log('❌ Summary context is empty or malformed');
      console.log('Context:', summary.context);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testGroqSummary();
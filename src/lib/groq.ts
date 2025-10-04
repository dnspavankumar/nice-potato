import { config } from './config';
import { EmailSummary } from '@/types';
import { RateLimiter } from './rate-limiter';
import { CircuitBreaker } from './circuit-breaker';

export class GroqService {
  private apiKey: string;
  private baseUrl: string = 'https://api.groq.com/openai/v1';
  private requestQueue: Array<() => Promise<any>> = [];
  private isProcessing: boolean = false;
  private lastRequestTime: number = 0;
  private minRequestInterval: number = config.groq.rateLimitDelay;
  private rateLimiter: RateLimiter;
  private circuitBreaker: CircuitBreaker;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    // Groq free tier: 30 requests per minute
    this.rateLimiter = new RateLimiter(30, 60000);
    this.circuitBreaker = new CircuitBreaker(5, 60000); // 5 failures, 1 minute recovery
  }

  async summarizeEmail(
    from: string,
    cc: string | undefined,
    subject: string,
    date: string,
    body: string
  ): Promise<EmailSummary> {
    try {
      const systemPrompt = `
Summarize the given email in the following format, keep it brief but don't lose much information:

OUTPUT FORMAT:
<Email Start>
Date and Time: (format: dd-MMM-yyyy HH:mm [with time zone])
Sender: 
CC:
Subject:
Email Context: 
<Email End>
`;

      const userPrompt = `
The email is the following: 

date and time: ${date}
from: ${from}
cc: ${cc || 'None'}
subject: ${subject}
body: ${body.substring(0, 4000)}...

Please summarize this email according to the format above.
`;

      const response = await this.callGroqAPI([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ]);

      return this.parseEmailSummary(response);
    } catch (error) {
      console.error('Error summarizing email:', error);
      // Return fallback summary
      return {
        dateTime: date,
        sender: from,
        cc: cc,
        subject: subject,
        context: body.substring(0, 500) + '...',
      };
    }
  }

  async answerQuestion(
    question: string,
    contextEmails: string[]
  ): Promise<string> {
    try {
      const systemPrompt = `
You are an AI assistant with access to a collection of emails. 
Below, you'll find the most relevant emails retrieved for the user's question. 
Your job is to answer the question based on the provided emails. 
If you cannot find the answer, please politely inform the user. 
Answer in a very short, brief, and informative manner.
`;

      const context = contextEmails.map((email, index) => 
        `Email(${index + 1}):\n\n${email}\n\n`
      ).join('');

      const userPrompt = `${context}\n\nQuestion: ${question}`;

      const response = await this.callGroqAPI([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ]);

      return response;
    } catch (error) {
      console.error('Error answering question:', error);
      return 'I apologize, but I encountered an error while processing your question. Please try again.';
    }
  }

  async continueConversation(
    messages: Array<{ role: string; content: string }>,
    newQuestion: string
  ): Promise<string> {
    try {
      const updatedMessages = [
        ...messages,
        { role: 'user', content: newQuestion }
      ];

      const response = await this.callGroqAPI(updatedMessages);
      return response;
    } catch (error) {
      console.error('Error continuing conversation:', error);
      return 'I apologize, but I encountered an error while processing your message. Please try again.';
    }
  }

  private async callGroqAPI(messages: Array<{ role: string; content: string }>): Promise<string> {
    return new Promise((resolve, reject) => {
      this.requestQueue.push(async () => {
        try {
          await this.rateLimitDelay();
          const result = await this.makeAPIRequest(messages);
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });
      
      this.processQueue();
    });
  }

  private async rateLimitDelay(): Promise<void> {
    // Use the rate limiter to ensure we don't exceed limits
    await this.rateLimiter.waitForSlot();
    
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < this.minRequestInterval) {
      const delay = this.minRequestInterval - timeSinceLastRequest;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    
    this.lastRequestTime = Date.now();
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.requestQueue.length === 0) {
      return;
    }

    this.isProcessing = true;
    
    while (this.requestQueue.length > 0) {
      const request = this.requestQueue.shift();
      if (request) {
        try {
          await request();
        } catch (error) {
          console.error('Queue processing error:', error);
        }
      }
    }
    
    this.isProcessing = false;
  }

  private async makeAPIRequest(messages: Array<{ role: string; content: string }>, retryCount: number = 0): Promise<string> {
    const maxRetries = config.groq.maxRetries;
    const baseDelay = 2000; // 2 seconds
    
    return this.circuitBreaker.execute(async () => {
      try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: config.groq.model,
          messages,
          temperature: config.groq.temperature,
          max_tokens: config.groq.maxTokens,
        }),
      });

      if (response.status === 429) {
        // Rate limit hit - implement exponential backoff
        if (retryCount < maxRetries) {
          const delay = baseDelay * Math.pow(2, retryCount);
          console.log(`Rate limit hit, retrying in ${delay}ms (attempt ${retryCount + 1}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, delay));
          return this.makeAPIRequest(messages, retryCount + 1);
        } else {
          throw new Error(`Groq API rate limit exceeded after ${maxRetries} retries`);
        }
      }

      if (!response.ok) {
        throw new Error(`Groq API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.choices || !data.choices[0] || !data.choices[0].message) {
        throw new Error('Invalid response format from Groq API');
      }

      return data.choices[0].message.content;
    } catch (error) {
      if (retryCount < maxRetries && (error as Error).message.includes('fetch')) {
        // Network error - retry with exponential backoff
        const delay = baseDelay * Math.pow(2, retryCount);
        console.log(`Network error, retrying in ${delay}ms (attempt ${retryCount + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.makeAPIRequest(messages, retryCount + 1);
      }
      
      console.error('Groq API call failed:', error);
      throw error;
    }
    });
  }

  private parseEmailSummary(summary: string): EmailSummary {
    try {
      // Parse the structured summary format
      const lines = summary.split('\n');
      let dateTime = '';
      let sender = '';
      let cc = '';
      let subject = '';
      let context = '';

      let currentSection = '';
      for (const line of lines) {
        if (line.includes('Date and Time:')) {
          dateTime = line.replace('Date and Time:', '').trim();
        } else if (line.includes('Sender:')) {
          sender = line.replace('Sender:', '').trim();
        } else if (line.includes('CC:')) {
          cc = line.replace('CC:', '').trim();
        } else if (line.includes('Subject:')) {
          subject = line.replace('Subject:', '').trim();
        } else if (line.includes('Email Context:')) {
          currentSection = 'context';
        } else if (currentSection === 'context' && line.trim()) {
          context += line + ' ';
        }
      }

      return {
        dateTime: dateTime || 'Unknown',
        sender: sender || 'Unknown',
        cc: cc || undefined,
        subject: subject || 'No Subject',
        context: context.trim() || 'No context available',
      };
    } catch (error) {
      console.error('Error parsing email summary:', error);
      // Return a basic summary if parsing fails
      return {
        dateTime: 'Unknown',
        sender: 'Unknown',
        subject: 'No Subject',
        context: summary.substring(0, 500),
      };
    }
  }

  getRateLimitStats() {
    return {
      rateLimit: this.rateLimiter.getStats(),
      circuitBreaker: this.circuitBreaker.getState()
    };
  }
}

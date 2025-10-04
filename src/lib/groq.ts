import { config } from './config';
import { EmailSummary } from '@/types';

export class GroqService {
  private apiKey: string;
  private baseUrl: string = 'https://api.groq.com/openai/v1';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
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

      if (!response.ok) {
        throw new Error(`Groq API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.choices || !data.choices[0] || !data.choices[0].message) {
        throw new Error('Invalid response format from Groq API');
      }

      return data.choices[0].message.content;
    } catch (error) {
      console.error('Groq API call failed:', error);
      throw error;
    }
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
}

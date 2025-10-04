import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { config } from './config';
import { Email } from '@/types';

export class GmailService {
  private oauth2Client: OAuth2Client;
  private gmail: ReturnType<typeof google.gmail>;

  constructor(accessToken: string, refreshToken?: string) {
    this.oauth2Client = new OAuth2Client(
      config.gmail.clientId,
      config.gmail.clientSecret,
      'http://localhost:3000/api/auth/callback/google'
    );

    const credentials: { access_token: string; refresh_token?: string } = {
      access_token: accessToken,
    };

    if (refreshToken) {
      credentials.refresh_token = refreshToken;
    }

    this.oauth2Client.setCredentials(credentials);

    this.gmail = google.gmail({ version: 'v1', auth: this.oauth2Client });
  }

  async getEmails(query: string = '', maxResults: number = 50): Promise<Email[]> {
    try {
      const response = await this.gmail.users.messages.list({
        userId: 'me',
        q: query,
        maxResults,
      });

      const messages = response.data.messages || [];
      const emails: Email[] = [];

      for (const message of messages) {
        try {
          if (message.id) {
            const email = await this.getEmailDetails(message.id);
            if (email) {
              emails.push(email);
            }
          }
        } catch (error) {
          console.error(`Error fetching email ${message.id}:`, error);
        }
      }

      return emails;
    } catch (error) {
      console.error('Error fetching emails:', error);
      throw error;
    }
  }

  async getEmailDetails(messageId: string): Promise<Email | null> {
    try {
      const response = await this.gmail.users.messages.get({
        userId: 'me',
        id: messageId,
        format: 'full',
      });

      const message = response.data;
      const headers = message.payload?.headers || [];
      
      const getHeader = (name: string) => 
        headers.find((h) => h.name === name)?.value || '';

      const from = getHeader('From');
      const cc = getHeader('Cc');
      const subject = getHeader('Subject');
      const date = getHeader('Date');
      const body = message.payload ? this.extractBody(message.payload as Record<string, unknown>) : '';

      return {
        id: messageId,
        from,
        cc: cc || undefined,
        subject,
        date,
        body,
      };
    } catch (error) {
      console.error(`Error fetching email details for ${messageId}:`, error);
      return null;
    }
  }

  private extractBody(payload: Record<string, unknown>): string {
    if (!payload) return '';

    // Handle multipart messages
    if (Array.isArray(payload.parts)) {
      for (const part of payload.parts) {
        const partObj = part as Record<string, unknown>;
        const body = partObj.body as Record<string, unknown>;
        if (partObj.mimeType === 'text/plain' && body?.data && typeof body.data === 'string') {
          return Buffer.from(body.data, 'base64').toString('utf-8');
        }
        if (partObj.mimeType === 'text/html' && body?.data && typeof body.data === 'string') {
          const html = Buffer.from(body.data, 'base64').toString('utf-8');
          return this.cleanHtml(html);
        }
      }
    }

    // Handle single part messages
    const body = payload.body as Record<string, unknown>;
    if (body?.data && typeof body.data === 'string') {
      const bodyText = Buffer.from(body.data, 'base64').toString('utf-8');
      return payload.mimeType === 'text/html' ? this.cleanHtml(bodyText) : bodyText;
    }

    return '';
  }

  private cleanHtml(html: string): string {
    // Simple HTML cleaning - in production, use a proper HTML parser
    return html
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/&nbsp;/g, ' ') // Replace &nbsp; with space
      .replace(/&amp;/g, '&') // Replace &amp; with &
      .replace(/&lt;/g, '<') // Replace &lt; with <
      .replace(/&gt;/g, '>') // Replace &gt; with >
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
      .trim();
  }

  async getRecentEmails(days: number = 7): Promise<Email[]> {
    const date = new Date();
    date.setDate(date.getDate() - days);
    const query = `after:${date.toISOString().split('T')[0]}`;
    
    return this.getEmails(query);
  }

  async getEmailsFromSender(sender: string, days: number = 30): Promise<Email[]> {
    const date = new Date();
    date.setDate(date.getDate() - days);
    const query = `from:${sender} after:${date.toISOString().split('T')[0]}`;
    
    return this.getEmails(query);
  }

  // Method similar to official docs - list Gmail labels
  async listLabels(): Promise<string[]> {
    try {
      const response = await this.gmail.users.labels.list({
        userId: 'me',
      });
      
      const labels = response.data.labels || [];
      return labels.map((label) => label.name || '').filter(name => name !== '');
    } catch (error) {
      console.error('Error fetching labels:', error);
      throw error;
    }
  }

  // Method to get recent Canara Bank emails specifically
  async getCanaraEmails(maxResults: number = 5): Promise<Email[]> {
    try {
      // Comprehensive query for Canara Bank emails
      const canaraQuery = [
        'from:canara',
        'from:canarabank.com',
        'from:canarabank.co.in',
        'subject:"canara bank"',
        'subject:"canara"',
        'body:"canara bank"'
      ].join(' OR ');
      
      console.log(`Searching for Canara Bank emails with query: ${canaraQuery}`);
      
      const response = await this.gmail.users.messages.list({
        userId: 'me',
        q: canaraQuery,
        maxResults,
      });

      const messages = response.data.messages || [];
      console.log(`Found ${messages.length} Canara Bank emails`);
      
      const emails: Email[] = [];

      for (const message of messages) {
        try {
          if (message.id) {
            const email = await this.getEmailDetails(message.id);
            if (email && this.isCanaraRelated(email)) {
              emails.push(email);
            }
          }
        } catch (error) {
          console.error(`Error fetching Canara email ${message.id}:`, error);
        }
      }

      // Sort by date (most recent first)
      emails.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
      return emails.slice(0, maxResults);
    } catch (error) {
      console.error('Error fetching Canara Bank emails:', error);
      throw error;
    }
  }

  // Helper method to verify if email is Canara Bank related
  private isCanaraRelated(email: Email): boolean {
    const searchText = `${email.from} ${email.subject} ${email.body}`.toLowerCase();
    const canaraKeywords = [
      'canara',
      'canarabank',
      'canara bank',
      'cnrb',
      'canbank'
    ];
    
    return canaraKeywords.some(keyword => searchText.includes(keyword));
  }

  // Method to test Gmail API connection (similar to official docs)
  async testConnection(): Promise<boolean> {
    try {
      const response = await this.gmail.users.getProfile({
        userId: 'me',
      });
      
      console.log(`Connected to Gmail for user: ${response.data.emailAddress}`);
      return true;
    } catch (error) {
      console.error('Gmail API connection failed:', error);
      return false;
    }
  }
}

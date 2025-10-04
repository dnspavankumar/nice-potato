import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { config } from './config';
import { Email, EmailSummary } from '@/types';

export class GmailService {
  private oauth2Client: OAuth2Client;
  private gmail: any;

  constructor(accessToken: string, refreshToken?: string) {
    this.oauth2Client = new OAuth2Client(
      config.gmail.clientId,
      config.gmail.clientSecret,
      'http://localhost:3000/api/auth/callback/google'
    );

    const credentials: any = {
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
          const email = await this.getEmailDetails(message.id);
          if (email) {
            emails.push(email);
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
        headers.find((h: any) => h.name === name)?.value || '';

      const from = getHeader('From');
      const cc = getHeader('Cc');
      const subject = getHeader('Subject');
      const date = getHeader('Date');
      const body = this.extractBody(message.payload);

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

  private extractBody(payload: any): string {
    if (!payload) return '';

    // Handle multipart messages
    if (payload.parts) {
      for (const part of payload.parts) {
        if (part.mimeType === 'text/plain' && part.body?.data) {
          return Buffer.from(part.body.data, 'base64').toString('utf-8');
        }
        if (part.mimeType === 'text/html' && part.body?.data) {
          const html = Buffer.from(part.body.data, 'base64').toString('utf-8');
          return this.cleanHtml(html);
        }
      }
    }

    // Handle single part messages
    if (payload.body?.data) {
      const body = Buffer.from(payload.body.data, 'base64').toString('utf-8');
      return payload.mimeType === 'text/html' ? this.cleanHtml(body) : body;
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
      return labels.map((label: any) => label.name);
    } catch (error) {
      console.error('Error fetching labels:', error);
      throw error;
    }
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

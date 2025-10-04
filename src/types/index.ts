export interface Email {
  id: string;
  from: string;
  cc?: string;
  subject: string;
  date: string;
  body: string;
  summary?: string;
  vectorId?: string;
}

export interface EmailSummary {
  dateTime: string;
  sender: string;
  cc?: string;
  subject: string;
  context: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

export interface VectorSearchResult {
  id: string;
  score: number;
  metadata: {
    emailId: string;
    summary: string;
    date: string;
    sender: string;
    subject: string;
  };
}

export interface User {
  id: string;
  email: string;
  name: string;
  image?: string;
  gmailConnected: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface GmailCredentials {
  access_token: string;
  refresh_token: string;
  scope: string;
  token_type: string;
  expiry_date: number;
}

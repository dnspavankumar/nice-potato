# Quick Setup Guide

## 1. Environment Setup

Copy the environment template and fill in your values:

```bash
cp env.template .env.local
```

Then edit `.env.local` with your actual API keys and credentials.

## 2. Required Services Setup

### Pinecone (Vector Database)
1. Go to [https://www.pinecone.io/](https://www.pinecone.io/)
2. Sign up and create a new project
3. Get your API key and environment name
4. Add them to `.env.local`:
   ```
   PINECONE_API_KEY="your_actual_api_key"
   PINECONE_ENVIRONMENT="your_environment_name"
   ```

### Groq API (LLM Service)
1. Go to [https://console.groq.com/](https://console.groq.com/)
2. Sign up and generate an API key
3. Add to `.env.local`:
   ```
   GROQ_API_KEY="your_actual_api_key"
   ```

### Google Cloud (Gmail API)
1. Go to [https://console.cloud.google.com/](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable the Gmail API
4. Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client IDs"
5. Set application type to "Web application"
6. Add authorized redirect URIs:
   - `http://localhost:3000/api/auth/callback/google`
   - `https://yourdomain.com/api/auth/callback/google` (for production)
7. Copy the Client ID and Client Secret to `.env.local`

### NextAuth Secret
Generate a random secret for NextAuth:
```bash
openssl rand -base64 32
```
Add it to `.env.local`:
```
NEXTAUTH_SECRET="your_generated_secret"
```

## 3. Run the Application

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see your Email RAG application!

## 4. Test the Application

1. Click "Sync Emails" to authenticate with Gmail
2. Grant permissions for email access
3. Wait for emails to be processed and indexed
4. Use the Chat tab to ask questions about your emails
5. Use the Search tab for semantic email search

## Troubleshooting

### Common Issues:

1. **"Pinecone index not found"**
   - The app will auto-create the index on first run
   - Make sure your Pinecone API key is correct

2. **"Gmail API quota exceeded"**
   - Check your Google Cloud Console for API quotas
   - The app processes emails in batches to avoid limits

3. **"Groq API error"**
   - Verify your Groq API key is correct
   - Check your Groq usage limits

4. **"Authentication failed"**
   - Make sure your Google OAuth redirect URIs are correct
   - Check that Gmail API is enabled in Google Cloud Console

## Next Steps

Once everything is working:
1. Deploy to Vercel or your preferred platform
2. Add your production domain to Google OAuth redirect URIs
3. Update environment variables for production
4. Consider adding user authentication for multi-user support

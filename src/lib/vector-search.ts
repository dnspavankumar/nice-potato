import { getPineconeIndex, searchVectors, upsertTexts } from './pinecone';
import { prepareTextForEmbedding, generateEmbedding } from './embeddings';
import { Email, VectorSearchResult } from '@/types';
import { config } from './config';

export class VectorSearchService {
  async indexEmail(email: Email, summary: string): Promise<void> {
    try {
      // Prepare text for embedding (combine email content with summary)
      const combinedText = `${email.subject} ${email.body} ${summary}`;
      const preparedText = prepareTextForEmbedding(combinedText);
      
      // Prepare metadata
      const metadata = {
        emailId: email.id,
        from: email.from,
        subject: email.subject,
        date: email.date,
        summary: summary,
        body: email.body.substring(0, 1000), // Store first 1000 chars of body
      };
      
      // Generate embedding for the text
      const embedding = await generateEmbedding(preparedText);
      
      // Upsert to Pinecone with embedding
      await upsertTexts([{
        id: email.id,
        values: embedding,
        metadata,
      }]);
      
      console.log(`Indexed email: ${email.id}`);
    } catch (error) {
      console.error(`Error indexing email ${email.id}:`, error);
      throw error;
    }
  }

  async indexEmails(emails: Email[], summaries: string[]): Promise<void> {
    try {
      const texts = [];
      
      for (let i = 0; i < emails.length; i++) {
        const email = emails[i];
        const summary = summaries[i] || '';
        
        // Prepare text for embedding
        const combinedText = `${email.subject} ${email.body} ${summary}`;
        const preparedText = prepareTextForEmbedding(combinedText);
        
        // Prepare metadata
        const metadata = {
          emailId: email.id,
          from: email.from,
          subject: email.subject,
          date: email.date,
          summary: summary,
          body: email.body.substring(0, 1000),
        };
        
        // Generate embedding for the text
        const embedding = await generateEmbedding(preparedText);
        
        texts.push({
          id: email.id,
          values: embedding,
          metadata,
        });
      }
      
      // Batch upsert to Pinecone (embeddings generated automatically)
      await upsertTexts(texts);
      console.log(`Indexed ${emails.length} emails`);
    } catch (error) {
      console.error('Error indexing emails:', error);
      throw error;
    }
  }

  async searchEmails(
    query: string,
    topK: number = config.vector.topK,
    filter?: Record<string, any>
  ): Promise<VectorSearchResult[]> {
    try {
      // Generate embedding for the query
      const queryEmbedding = await generateEmbedding(query);
      
      // Search in Pinecone with embedding
      const results = await searchVectors(queryEmbedding, topK, filter);
      
      // Transform results to our format
      return results.map((result, index) => ({
        id: result.id || `result-${index}`,
        score: result.score || 0,
        metadata: {
          emailId: result.metadata?.emailId || '',
          summary: result.metadata?.summary || '',
          date: result.metadata?.date || '',
          sender: result.metadata?.from || '',
          subject: result.metadata?.subject || '',
        },
      }));
    } catch (error) {
      console.error('Error searching emails:', error);
      throw error;
    }
  }

  async searchEmailsBySender(
    query: string,
    sender: string,
    topK: number = config.vector.topK
  ): Promise<VectorSearchResult[]> {
    return this.searchEmails(query, topK, { from: sender });
  }

  async searchEmailsByDateRange(
    query: string,
    startDate: string,
    endDate: string,
    topK: number = config.vector.topK
  ): Promise<VectorSearchResult[]> {
    return this.searchEmails(query, topK, {
      date: {
        $gte: startDate,
        $lte: endDate,
      },
    });
  }

  async getSimilarEmails(
    emailId: string,
    topK: number = 10
  ): Promise<VectorSearchResult[]> {
    try {
      // First, get the email's embedding
      const index = await getPineconeIndex();
      const fetchResponse = await index.fetch([emailId]);
      
      if (!fetchResponse.vectors || !fetchResponse.vectors[emailId]) {
        throw new Error(`Email ${emailId} not found in vector database`);
      }
      
      const emailVector = fetchResponse.vectors[emailId].values;
      
      // Search for similar emails
      const results = await searchVectors(emailVector, topK + 1); // +1 to exclude the original email
      
      // Filter out the original email and transform results
      return results
        .filter(result => result.id !== emailId)
        .map((result, index) => ({
          id: result.id || `similar-${index}`,
          score: result.score || 0,
          metadata: {
            emailId: result.metadata?.emailId || '',
            summary: result.metadata?.summary || '',
            date: result.metadata?.date || '',
            sender: result.metadata?.from || '',
            subject: result.metadata?.subject || '',
          },
        }));
    } catch (error) {
      console.error('Error finding similar emails:', error);
      throw error;
    }
  }

  async deleteEmail(emailId: string): Promise<void> {
    try {
      const index = await getPineconeIndex();
      await index.deleteOne(emailId);
      console.log(`Deleted email from vector database: ${emailId}`);
    } catch (error) {
      console.error(`Error deleting email ${emailId}:`, error);
      throw error;
    }
  }

  async deleteEmails(emailIds: string[]): Promise<void> {
    try {
      const index = await getPineconeIndex();
      await index.deleteMany(emailIds);
      console.log(`Deleted ${emailIds.length} emails from vector database`);
    } catch (error) {
      console.error('Error deleting emails:', error);
      throw error;
    }
  }
}

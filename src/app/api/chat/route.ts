import { NextRequest, NextResponse } from 'next/server';
import { GroqService } from '@/lib/groq';
import { VectorSearchService } from '@/lib/vector-search';
import { config } from '@/lib/config';

export async function POST(request: NextRequest) {
  try {
    const { question, conversationHistory = [] } = await request.json();

    if (!question) {
      return NextResponse.json(
        { error: 'Question is required' },
        { status: 400 }
      );
    }

    // Initialize services
    const groqService = new GroqService(config.groq.apiKey);
    const vectorService = new VectorSearchService();

    // Search for relevant emails
    console.log('Searching for relevant emails...');
    const searchResults = await vectorService.searchEmails(question);
    
    if (searchResults.length === 0) {
      return NextResponse.json({
        answer: 'I couldn\'t find any relevant emails to answer your question. Please try rephrasing your question or check if your emails have been synced.',
        relevantEmails: [],
      });
    }

    // Prepare context from search results
    const contextEmails = searchResults.map(result => {
      try {
        const summary = JSON.parse(result.metadata.summary);
        return `<Email Start>
Date and Time: ${summary.dateTime || result.metadata.date}
Sender: ${summary.sender || result.metadata.sender}
CC: ${summary.cc || 'None'}
Subject: ${summary.subject || result.metadata.subject}
Email Context: ${summary.context || 'No context available'}
<Email End>`;
      } catch (error) {
        return `<Email Start>
Date and Time: ${result.metadata.date}
Sender: ${result.metadata.sender}
Subject: ${result.metadata.subject}
Email Context: ${result.metadata.summary}
<Email End>`;
      }
    });

    // Generate answer using Groq
    let answer: string;
    
    if (conversationHistory.length > 0) {
      // Continue existing conversation
      const messages = conversationHistory.map((msg: any) => ({
        role: msg.role,
        content: msg.content,
      }));
      
      answer = await groqService.continueConversation(messages, question);
    } else {
      // New conversation
      answer = await groqService.answerQuestion(question, contextEmails);
    }

    return NextResponse.json({
      answer,
      relevantEmails: searchResults.map(result => ({
        id: result.metadata.emailId,
        subject: result.metadata.subject,
        sender: result.metadata.sender,
        date: result.metadata.date,
        score: result.score,
      })),
      conversationHistory: [
        ...conversationHistory,
        { role: 'user', content: question },
        { role: 'assistant', content: answer },
      ],
    });

  } catch (error) {
    console.error('Error processing chat request:', error);
    return NextResponse.json(
      { error: 'Failed to process chat request', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

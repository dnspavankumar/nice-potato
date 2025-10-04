import { NextResponse } from 'next/server';
import { GroqService } from '@/lib/groq';
import { config } from '@/lib/config';

export async function GET() {
  try {
    const groqService = new GroqService(config.groq.apiKey);
    const stats = groqService.getRateLimitStats();
    
    return NextResponse.json({
      rateLimitStats: stats,
      config: {
        model: config.groq.model,
        rateLimitDelay: config.groq.rateLimitDelay,
        maxRetries: config.groq.maxRetries,
        concurrencyLimit: config.groq.concurrencyLimit,
      },
      status: 'healthy'
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to get Groq status', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
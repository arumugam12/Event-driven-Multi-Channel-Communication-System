import { MESSAGE_STATUS, ERROR_MESSAGES } from './constants';

export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public isOperational: boolean = true,
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400);
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = ERROR_MESSAGES.RATE_LIMIT_EXCEEDED) {
    super(message, 429);
  }
}

export class ServiceUnavailableError extends AppError {
  constructor(message: string) {
    super(message, 503);
  }
}

// Utility functions
export function sanitizeMessage(message: string): string {
  return message.trim().substring(0, 4000); // Limit message length
}

export function isValidPlatform(platform: string): boolean {
  const validPlatforms = ['telegram', 'whatsapp', 'instagram', 'discord'];
  return validPlatforms.includes(platform.toLowerCase());
}

export function generateMessageId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function calculateProcessingTime(startTime: number): number {
  return Date.now() - startTime;
}

export function formatContextForAI(messages: any[]): string {
  return messages
    .slice(-5) // Last 5 messages
    .map(msg => `${msg.direction}: ${msg.content}`)
    .join('\n');
}

export function isSpamMessage(message: string): boolean {
  const spamIndicators = [
    /(.)\1{4,}/, // Repeated characters
    /[A-Z]{10,}/, // All caps
    /https?:\/\/[^\s]+/g, // URLs (might be spam)
    /[!]{3,}/, // Multiple exclamation marks
  ];
  
  return spamIndicators.some(pattern => pattern.test(message));
}

export function extractUserInfo(metadata: any): { userId: string; username?: string; firstName?: string } {
  return {
    userId: metadata.userId || metadata.from?.id || 'unknown',
    username: metadata.username || metadata.from?.username,
    firstName: metadata.firstName || metadata.from?.first_name,
  };
}

export function createResponseMessage(
  originalMessage: string,
  aiResponse: string,
  context?: any,
): any {
  return {
    originalMessage,
    aiResponse,
    context,
    timestamp: new Date().toISOString(),
    status: MESSAGE_STATUS.COMPLETED,
  };
}

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000,
): Promise<T> {
  return new Promise(async (resolve, reject) => {
    let lastError: Error;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const result = await fn();
        return resolve(result);
      } catch (error) {
        lastError = error as Error;
        
        if (attempt === maxRetries) {
          return reject(lastError);
        }
        
        const delay = baseDelay * Math.pow(2, attempt);
        await sleep(delay);
      }
    }
  });
}


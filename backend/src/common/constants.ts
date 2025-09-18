export const PLATFORMS = {
  TELEGRAM: 'telegram',
  WHATSAPP: 'whatsapp',
  INSTAGRAM: 'instagram',
  DISCORD: 'discord',
  USERBOT: 'userbot',
} as const;

export const MESSAGE_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
} as const;

export const QUEUE_NAMES = {
  MESSAGE_PROCESSING: 'message-processing',
  AI_RESPONSE: 'ai-response',
  MESSAGE_DELIVERY: 'message-delivery',
} as const;

export const RATE_LIMITS = {
  MESSAGES_PER_MINUTE: 10,
  MESSAGES_PER_HOUR: 100,
  MESSAGES_PER_DAY: 1000,
} as const;

export const AI_CONFIG = {
  DEFAULT_MODEL: 'gpt-3.5-turbo',
  MAX_TOKENS: 150,
  TEMPERATURE: 0.7,
  CONTEXT_WINDOW: 5, // Number of previous messages to include
} as const;

export const ERROR_MESSAGES = {
  INVALID_PLATFORM: 'Invalid platform specified',
  MESSAGE_TOO_LONG: 'Message exceeds maximum length',
  RATE_LIMIT_EXCEEDED: 'Rate limit exceeded',
  AI_SERVICE_UNAVAILABLE: 'AI service is currently unavailable',
  PLATFORM_SERVICE_UNAVAILABLE: 'Platform service is currently unavailable',
} as const;

export const WEBHOOK_PATHS = {
  TELEGRAM: '/webhook/telegram',
  WHATSAPP: '/webhook/whatsapp',
  INSTAGRAM: '/webhook/instagram',
} as const;


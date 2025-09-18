import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';
import { QueueService, MessageProcessingJob, AIResponseJob, MessageDeliveryJob } from '../queue/queue.service';
import { DatabaseService } from '../config/db.service';
import { TelegramService } from '../telegram/telegram.service';
import { UserbotService } from '../userbot/userbot.service';
import { QUEUE_NAMES, AI_CONFIG, PLATFORMS } from '../common/constants';
import { 
  isSpamMessage, 
  formatContextForAI, 
  calculateProcessingTime,
  retryWithBackoff,
  ServiceUnavailableError 
} from '../common/utils';
import OpenAI from 'openai';

@Processor(QUEUE_NAMES.MESSAGE_PROCESSING)
@Injectable()
export class WorkerService {
  private readonly logger = new Logger(WorkerService.name);
  private openai: OpenAI;

  constructor(
    private configService: ConfigService,
    private queueService: QueueService,
    private databaseService: DatabaseService,
    private telegramService: TelegramService,
    private userbotService: UserbotService,
  ) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY is required');
    }

    this.openai = new OpenAI({ apiKey });
    this.logger.log('Worker service initialized');
  }

  @Process('process-message')
  async processMessage(job: Job<MessageProcessingJob>) {
    const startTime = Date.now();
    const { messageId, userId, platform, message, metadata } = job.data;

    this.logger.log(`Processing message ${messageId} from ${userId} on ${platform}`);

    try {
      // Update message status to processing
      await this.databaseService.logMessage({
        id: messageId,
        status: 'processing',
      });

      // Check for spam
      if (isSpamMessage(message)) {
        this.logger.warn(`Spam detected in message ${messageId}`);
        await this.databaseService.logMessage({
          id: messageId,
          status: 'failed',
          errorMessage: 'Spam detected',
          processingTimeMs: calculateProcessingTime(startTime),
        });
        return;
      }

      // Get user context and message history
      const userContext = await this.databaseService.getUserContext(userId, platform);
      const messageHistory = await this.databaseService.getMessageHistory(userId, platform, AI_CONFIG.CONTEXT_WINDOW);

      // Prepare context for AI
      const context = {
        userContext: userContext?.context || {},
        messageHistory: messageHistory.map(msg => ({
          direction: msg.incomingMessage ? 'user' : 'assistant',
          content: msg.incomingMessage || msg.outgoingMessage,
          timestamp: msg.timestamp,
        })),
        currentMessage: message,
        platform,
        metadata,
      };

      // Add to AI response queue
      await this.queueService.addAIResponseJob({
        messageId,
        userId,
        platform,
        message,
        context,
        metadata,
      });

      this.logger.log(`Message ${messageId} queued for AI processing`);
    } catch (error) {
      this.logger.error(`Error processing message ${messageId}:`, error);
      await this.databaseService.logMessage({
        id: messageId,
        status: 'failed',
        errorMessage: error.message,
        processingTimeMs: calculateProcessingTime(startTime),
      });
      throw error;
    }
  }

  @Process('generate-response')
  async generateAIResponse(job: Job<AIResponseJob>) {
    const startTime = Date.now();
    const { messageId, userId, platform, message, context, metadata } = job.data;

    this.logger.log(`Generating AI response for message ${messageId}`);

    try {
      // Prepare conversation context
      const conversationContext = formatContextForAI(context.messageHistory);
      const systemPrompt = this.getSystemPrompt(platform, context.userContext);
      
      const messages = [
        { role: 'system', content: systemPrompt },
        ...(conversationContext ? [{ role: 'user', content: conversationContext }] : []),
        { role: 'user', content: message },
      ];

      // Generate AI response
      const completion = await retryWithBackoff(async () => {
        return await this.openai.chat.completions.create({
          model: this.configService.get('OPENAI_MODEL', AI_CONFIG.DEFAULT_MODEL),
          messages: messages as any,
          max_tokens: this.configService.get('OPENAI_MAX_TOKENS', AI_CONFIG.MAX_TOKENS),
          temperature: this.configService.get('OPENAI_TEMPERATURE', AI_CONFIG.TEMPERATURE),
        });
      });

      const aiResponse = completion.choices[0]?.message?.content?.trim();
      
      if (!aiResponse) {
        throw new Error('Empty response from AI');
      }

      // Update user context
      const updatedContext = {
        ...context.userContext,
        lastMessage: message,
        lastResponse: aiResponse,
        messageCount: (context.userContext.messageCount || 0) + 1,
      };

      await this.databaseService.updateUserContext(userId, platform, updatedContext);

      // Add to delivery queue
      await this.queueService.addMessageDeliveryJob({
        messageId,
        userId,
        platform,
        response: aiResponse,
        metadata,
      });

      this.logger.log(`AI response generated for message ${messageId}`);
    } catch (error) {
      this.logger.error(`Error generating AI response for message ${messageId}:`, error);
      await this.databaseService.logMessage({
        id: messageId,
        status: 'failed',
        errorMessage: `AI generation failed: ${error.message}`,
        processingTimeMs: calculateProcessingTime(startTime),
      });
      throw error;
    }
  }

  @Process('deliver-message')
  async deliverMessage(job: Job<MessageDeliveryJob>) {
    const startTime = Date.now();
    const { messageId, userId, platform, response, metadata } = job.data;

    this.logger.log(`Delivering message ${messageId} to ${userId} on ${platform}`);

    try {
      let deliveryResult;

      // Deliver based on platform
      switch (platform) {
        case PLATFORMS.TELEGRAM:
          deliveryResult = await this.deliverTelegramMessage(userId, response, metadata);
          break;
        case PLATFORMS.USERBOT:
          deliveryResult = await this.deliverUserbotMessage(userId, response, metadata);
          break;
        case PLATFORMS.WHATSAPP:
          // TODO: Implement WhatsApp delivery
          throw new Error('WhatsApp delivery not implemented yet');
        case PLATFORMS.INSTAGRAM:
          // TODO: Implement Instagram delivery
          throw new Error('Instagram delivery not implemented yet');
        default:
          throw new Error(`Unsupported platform: ${platform}`);
      }

      // Update message log with response
      await this.databaseService.logMessage({
        id: messageId,
        outgoingMessage: response,
        status: 'completed',
        processingTimeMs: calculateProcessingTime(startTime),
        processedAt: new Date(),
      });

      this.logger.log(`Message ${messageId} delivered successfully`);
    } catch (error) {
      this.logger.error(`Error delivering message ${messageId}:`, error);
      await this.databaseService.logMessage({
        id: messageId,
        status: 'failed',
        errorMessage: `Delivery failed: ${error.message}`,
        processingTimeMs: calculateProcessingTime(startTime),
      });
      throw error;
    }
  }

  private async deliverTelegramMessage(userId: string, response: string, metadata: any): Promise<any> {
    const chatId = metadata.chatId || userId;
    const formattedResponse = this.telegramService.formatMessage(response, metadata.from);
    
    return await this.telegramService.sendMessage(chatId, formattedResponse);
  }

  private async deliverUserbotMessage(userId: string, response: string, metadata: any): Promise<any> {
    const peerId = metadata.peerId || userId;
    return await this.userbotService.sendMessageToPeer(peerId, response);
  }

  private getSystemPrompt(platform: string, userContext: any): string {
    const basePrompt = `You are a helpful AI assistant integrated into a multi-channel communication system. 
You respond to users across different platforms (Telegram, WhatsApp, Instagram, etc.) in a natural, conversational manner.

Guidelines:
- Be helpful, friendly, and concise
- Keep responses under 150 words
- Adapt your tone to the platform (more casual for social media)
- Don't mention that you're an AI unless asked
- If you don't know something, say so honestly
- Be respectful and avoid controversial topics`;

    const platformSpecific = {
      [PLATFORMS.TELEGRAM]: 'You are responding via Telegram. Keep it conversational and use emojis sparingly.',
      [PLATFORMS.WHATSAPP]: 'You are responding via WhatsApp. Be friendly and personal.',
      [PLATFORMS.INSTAGRAM]: 'You are responding via Instagram. Be trendy and engaging.',
    };

    const contextInfo = userContext.messageCount > 0 
      ? `This user has sent ${userContext.messageCount} messages before.`
      : 'This is a new user.';

    return `${basePrompt}\n\n${platformSpecific[platform] || ''}\n\n${contextInfo}`;
  }
}


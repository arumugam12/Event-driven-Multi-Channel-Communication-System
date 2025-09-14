import { Controller, Post, Body, Get, Param, HttpException, HttpStatus } from '@nestjs/common';
import { TelegramService } from './telegram.service';
import { QueueService } from '../queue/queue.service';
import { DatabaseService } from '../config/db.service';
import { generateMessageId, extractUserInfo, sanitizeMessage } from '../common/utils';
import { PLATFORMS } from '../common/constants';

export interface TelegramWebhookUpdate {
  update_id: number;
  message?: {
    message_id: number;
    from: {
      id: number;
      is_bot: boolean;
      first_name: string;
      last_name?: string;
      username?: string;
      language_code?: string;
    };
    chat: {
      id: number;
      first_name?: string;
      last_name?: string;
      username?: string;
      type: string;
    };
    date: number;
    text?: string;
  };
}

@Controller('webhook/telegram')
export class TelegramController {
  constructor(
    private readonly telegramService: TelegramService,
    private readonly queueService: QueueService,
    private readonly databaseService: DatabaseService,
  ) {}

  @Post()
  async handleWebhook(@Body() update: TelegramWebhookUpdate) {
    try {
      // Only process text messages
      if (!update.message || !update.message.text) {
        return { status: 'ignored', reason: 'not a text message' };
      }

      const message = update.message;
      const userInfo = extractUserInfo({
        userId: message.from.id.toString(),
        username: message.from.username,
        firstName: message.from.first_name,
      });

      // Sanitize the incoming message
      const sanitizedMessage = sanitizeMessage(message.text);
      
      // Create message log entry
      const messageId = generateMessageId();
      const messageLog = await this.databaseService.logMessage({
        id: messageId,
        userId: userInfo.userId,
        platform: PLATFORMS.TELEGRAM,
        incomingMessage: sanitizedMessage,
        metadata: {
          telegramMessageId: message.message_id,
          chatId: message.chat.id,
          from: message.from,
          chat: message.chat,
        },
        status: 'pending',
        timestamp: new Date(),
      });

      // Add to processing queue
      await this.queueService.addMessageProcessingJob({
        messageId,
        userId: userInfo.userId,
        platform: PLATFORMS.TELEGRAM,
        message: sanitizedMessage,
        metadata: {
          telegramMessageId: message.message_id,
          chatId: message.chat.id,
          from: message.from,
          chat: message.chat,
        },
        timestamp: new Date(),
      });

      return { status: 'queued', messageId };
    } catch (error) {
      console.error('Telegram webhook error:', error);
      throw new HttpException(
        'Failed to process webhook',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('health')
  async healthCheck() {
    try {
      const botInfo = await this.telegramService.getBotInfo();
      return {
        status: 'healthy',
        bot: botInfo,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      throw new HttpException(
        'Telegram service unhealthy',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  @Post('send/:chatId')
  async sendMessage(
    @Param('chatId') chatId: string,
    @Body() body: { message: string },
  ) {
    try {
      const result = await this.telegramService.sendMessage(chatId, body.message);
      return { status: 'sent', result };
    } catch (error) {
      throw new HttpException(
        'Failed to send message',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}


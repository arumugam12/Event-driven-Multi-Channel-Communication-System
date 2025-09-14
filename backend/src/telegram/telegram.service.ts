import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as TelegramBot from 'node-telegram-bot-api';
import { retryWithBackoff, ServiceUnavailableError } from '../common/utils';

@Injectable()
export class TelegramService {
  private readonly logger = new Logger(TelegramService.name);
  private bot: TelegramBot;

  constructor(private configService: ConfigService) {
    const token = this.configService.get<string>('TELEGRAM_BOT_TOKEN');
    if (!token) {
      throw new Error('TELEGRAM_BOT_TOKEN is required');
    }

    this.bot = new TelegramBot(token, { polling: false });
    this.logger.log('Telegram bot initialized');
  }

  async getBotInfo(): Promise<any> {
    try {
      return await retryWithBackoff(async () => {
        return await this.bot.getMe();
      });
    } catch (error) {
      this.logger.error('Failed to get bot info:', error);
      throw new ServiceUnavailableError('Telegram API unavailable');
    }
  }

  async sendMessage(chatId: string, text: string): Promise<any> {
    try {
      this.logger.log(`Sending message to chat ${chatId}: ${text.substring(0, 50)}...`);
      
      return await retryWithBackoff(async () => {
        return await this.bot.sendMessage(chatId, text, {
          parse_mode: 'HTML',
          disable_web_page_preview: true,
        });
      });
    } catch (error) {
      this.logger.error(`Failed to send message to ${chatId}:`, error);
      throw new ServiceUnavailableError('Failed to send Telegram message');
    }
  }

  async sendMessageWithOptions(chatId: string, text: string, options: any = {}): Promise<any> {
    try {
      const defaultOptions = {
        parse_mode: 'HTML',
        disable_web_page_preview: true,
        ...options,
      };

      return await retryWithBackoff(async () => {
        return await this.bot.sendMessage(chatId, text, defaultOptions);
      });
    } catch (error) {
      this.logger.error(`Failed to send message with options to ${chatId}:`, error);
      throw new ServiceUnavailableError('Failed to send Telegram message');
    }
  }

  async setWebhook(webhookUrl: string): Promise<boolean> {
    try {
      this.logger.log(`Setting webhook to: ${webhookUrl}`);
      
      const result = await retryWithBackoff(async () => {
        return await this.bot.setWebHook(webhookUrl);
      });

      this.logger.log('Webhook set successfully');
      return result;
    } catch (error) {
      this.logger.error('Failed to set webhook:', error);
      throw new ServiceUnavailableError('Failed to set Telegram webhook');
    }
  }

  async deleteWebhook(): Promise<boolean> {
    try {
      this.logger.log('Deleting webhook');
      
      const result = await retryWithBackoff(async () => {
        return await this.bot.deleteWebHook();
      });

      this.logger.log('Webhook deleted successfully');
      return result;
    } catch (error) {
      this.logger.error('Failed to delete webhook:', error);
      throw new ServiceUnavailableError('Failed to delete Telegram webhook');
    }
  }

  async getWebhookInfo(): Promise<any> {
    try {
      return await retryWithBackoff(async () => {
        return await this.bot.getWebHookInfo();
      });
    } catch (error) {
      this.logger.error('Failed to get webhook info:', error);
      throw new ServiceUnavailableError('Failed to get Telegram webhook info');
    }
  }

  async answerCallbackQuery(callbackQueryId: string, text?: string): Promise<boolean> {
    try {
      return await retryWithBackoff(async () => {
        return await this.bot.answerCallbackQuery(callbackQueryId, { text });
      });
    } catch (error) {
      this.logger.error('Failed to answer callback query:', error);
      throw new ServiceUnavailableError('Failed to answer callback query');
    }
  }

  async editMessageText(chatId: string, messageId: number, text: string, options?: any): Promise<any> {
    try {
      return await retryWithBackoff(async () => {
        return await this.bot.editMessageText(text, {
          chat_id: chatId,
          message_id: messageId,
          parse_mode: 'HTML',
          ...options,
        });
      });
    } catch (error) {
      this.logger.error('Failed to edit message text:', error);
      throw new ServiceUnavailableError('Failed to edit message text');
    }
  }

  async deleteMessage(chatId: string, messageId: number): Promise<boolean> {
    try {
      return await retryWithBackoff(async () => {
        return await this.bot.deleteMessage(chatId, messageId);
      });
    } catch (error) {
      this.logger.error('Failed to delete message:', error);
      throw new ServiceUnavailableError('Failed to delete message');
    }
  }

  // Utility method to format messages
  formatMessage(text: string, userInfo?: any): string {
    let formattedText = text;
    
    // Add user context if available
    if (userInfo?.firstName) {
      formattedText = `Hi ${userInfo.firstName}! ${text}`;
    }
    
    // Escape HTML characters
    formattedText = formattedText
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    
    return formattedText;
  }
}


import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Api, TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions';
import input from 'input';
import { QueueService } from '../queue/queue.service';
import { DatabaseService } from '../config/db.service';
import { PLATFORMS } from '../common/constants';
import { extractUserInfo, generateMessageId, sanitizeMessage } from '../common/utils';

@Injectable()
export class UserbotService implements OnModuleInit {
  private readonly logger = new Logger(UserbotService.name);
  private client: TelegramClient;

  constructor(
    private readonly configService: ConfigService,
    private readonly queueService: QueueService,
    private readonly databaseService: DatabaseService,
  ) {}

  async onModuleInit() {
    const apiId = Number(this.configService.get('TG_API_ID'));
    const apiHash = this.configService.get<string>('TG_API_HASH');
    let session = this.configService.get<string>('TG_STRING_SESSION') || '';

    if (!apiId || !apiHash) {
      this.logger.warn('Userbot disabled: TG_API_ID/TG_API_HASH not set');
      return;
    }

    try {
      const stringSession = new StringSession(session);
      this.client = new TelegramClient(stringSession, apiId, apiHash, { connectionRetries: 5 });
      await this.client.start({
        phoneNumber: async () => this.configService.get('TG_PHONE') || (await input.text('Phone number: ')),
        password: async () => this.configService.get('TG_2FA_PASSWORD') || (await input.text('2FA password (if any): ')),
        phoneCode: async () => await input.text('Code: '),
        onError: (err) => this.logger.error('Userbot login error', err as any),
      });

      const saved = this.client.session.save();
      if (!session) {
        this.logger.warn('Store this TG_STRING_SESSION securely:');
        this.logger.warn(saved);
      }

      this.logger.log('Userbot logged in');
      this.bindMessageListener();
    } catch (error) {
      this.logger.error('Failed to init userbot', error as any);
    }
  }

  private bindMessageListener() {
    this.client.addEventHandler(async (event) => {
      try {
        // @ts-ignore - GramJS types for event.message
        const message = event?.message;
        if (!message || !message.isPrivate || !message.message) return;

        const text: string = message.message as string;
        const peerId = message.peerId?.userId?.toString();
        if (!peerId) return;

        const sanitized = sanitizeMessage(text);
        const messageId = generateMessageId();

        await this.databaseService.logMessage({
          id: messageId,
          userId: peerId,
          platform: PLATFORMS.USERBOT,
          incomingMessage: sanitized,
          metadata: {
            peerId,
          },
          status: 'pending',
          timestamp: new Date(),
        } as any);

        await this.queueService.addMessageProcessingJob({
          messageId,
          userId: peerId,
          platform: PLATFORMS.USERBOT,
          message: sanitized,
          metadata: { peerId },
          timestamp: new Date(),
        });
      } catch (e) {
        this.logger.error('Userbot event error', e as any);
      }
    });
  }

  async sendMessageToPeer(peerId: string, text: string) {
    if (!this.client) throw new Error('Userbot client not initialized');
    await this.client.sendMessage(peerId, { message: text });
  }
}




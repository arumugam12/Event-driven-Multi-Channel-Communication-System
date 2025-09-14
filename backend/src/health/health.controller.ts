import { Controller, Get } from '@nestjs/common';
import { DatabaseService } from '../config/db.service';
import { QueueService } from '../queue/queue.service';
import { TelegramService } from '../telegram/telegram.service';

@Controller('health')
export class HealthController {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly queueService: QueueService,
    private readonly telegramService: TelegramService,
  ) {}

  @Get()
  async getHealth() {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {},
    };

    // Check database
    try {
      await this.databaseService.getMessageStats();
      health.services['database'] = { status: 'healthy' };
    } catch (error) {
      health.services['database'] = { status: 'unhealthy', error: error.message };
      health.status = 'unhealthy';
    }

    // Check queue
    try {
      await this.queueService.getQueueStats();
      health.services['queue'] = { status: 'healthy' };
    } catch (error) {
      health.services['queue'] = { status: 'unhealthy', error: error.message };
      health.status = 'unhealthy';
    }

    // Check Telegram
    try {
      await this.telegramService.getBotInfo();
      health.services['telegram'] = { status: 'healthy' };
    } catch (error) {
      health.services['telegram'] = { status: 'unhealthy', error: error.message };
      health.status = 'unhealthy';
    }

    return health;
  }

  @Get('stats')
  async getStats() {
    try {
      const [messageStats, queueStats] = await Promise.all([
        this.databaseService.getMessageStats(),
        this.queueService.getQueueStats(),
      ]);

      return {
        messages: messageStats,
        queues: queueStats,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        error: 'Failed to fetch stats',
        message: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }
}



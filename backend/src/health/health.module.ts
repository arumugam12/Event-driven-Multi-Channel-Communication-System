import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { DatabaseModule } from '../config/db.module';
import { QueueModule } from '../queue/queue.module';
import { TelegramModule } from '../telegram/telegram.module';

@Module({
  imports: [DatabaseModule, QueueModule, TelegramModule],
  controllers: [HealthController],
})
export class HealthModule {}



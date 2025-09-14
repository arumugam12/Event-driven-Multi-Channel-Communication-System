import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TelegramController } from './telegram.controller';
import { TelegramService } from './telegram.service';
import { QueueModule } from '../queue/queue.module';
import { DatabaseModule } from '../config/db.module';

@Module({
  imports: [ConfigModule, QueueModule, DatabaseModule],
  controllers: [TelegramController],
  providers: [TelegramService],
  exports: [TelegramService],
})
export class TelegramModule {}


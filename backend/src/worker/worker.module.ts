import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { WorkerService } from './worker.service';
import { QueueModule } from '../queue/queue.module';
import { DatabaseModule } from '../config/db.module';
import { TelegramModule } from '../telegram/telegram.module';
import { UserbotModule } from '../userbot/userbot.module';
import { QUEUE_NAMES } from '../common/constants';

@Module({
  imports: [
    BullModule.registerQueue(
      { name: QUEUE_NAMES.MESSAGE_PROCESSING },
      { name: QUEUE_NAMES.AI_RESPONSE },
      { name: QUEUE_NAMES.MESSAGE_DELIVERY },
    ),
    QueueModule,
    DatabaseModule,
    TelegramModule,
    UserbotModule,
  ],
  providers: [WorkerService],
  exports: [WorkerService],
})
export class WorkerModule {}


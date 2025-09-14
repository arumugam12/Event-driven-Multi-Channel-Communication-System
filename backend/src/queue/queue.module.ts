import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { QueueService } from './queue.service';
import { QUEUE_NAMES } from '../common/constants';

@Module({
  imports: [
    BullModule.registerQueue(
      { name: QUEUE_NAMES.MESSAGE_PROCESSING },
      { name: QUEUE_NAMES.AI_RESPONSE },
      { name: QUEUE_NAMES.MESSAGE_DELIVERY },
    ),
  ],
  providers: [QueueService],
  exports: [QueueService, BullModule],
})
export class QueueModule {}
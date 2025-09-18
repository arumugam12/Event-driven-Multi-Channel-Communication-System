import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from '../config/db.module';
import { QueueModule } from '../queue/queue.module';
import { UserbotService } from './userbot.service';

@Module({
  imports: [ConfigModule, DatabaseModule, QueueModule],
  providers: [UserbotService],
  exports: [UserbotService],
})
export class UserbotModule {}




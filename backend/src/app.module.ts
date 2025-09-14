import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bull';
import { ScheduleModule } from '@nestjs/schedule';

// Import modules
import { DatabaseModule } from './config/db.module';
import { QueueModule } from './queue/queue.module';
import { TelegramModule } from './telegram/telegram.module';
import { WorkerModule } from './worker/worker.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    
    // Database
    DatabaseModule,
    
    // Message Queue
    BullModule.forRoot({
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT) || 6379,
        password: process.env.REDIS_PASSWORD || undefined,
      },
    }),
    
    // Task Scheduling
    ScheduleModule.forRoot(),
    
    // Feature Modules
    QueueModule,
    TelegramModule,
    WorkerModule,
    HealthModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}

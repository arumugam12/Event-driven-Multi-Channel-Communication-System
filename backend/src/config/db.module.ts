import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { DatabaseService } from './db.service';
import { MessageLog, MessageLogSchema } from './schemas/MessageLog.schema';
import { UserContext, UserContextSchema } from './schemas/UserContext.schema';

@Module({
  imports: [
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>('MONGO_URI', 'mongodb://localhost:27017/communication_system'),
        dbName: configService.get<string>('MONGO_DB', 'communication_system'),
      }),
      inject: [ConfigService],
    }),
    MongooseModule.forFeature([
      { name: MessageLog.name, schema: MessageLogSchema },
      { name: UserContext.name, schema: UserContextSchema },
    ]),
  ],
  providers: [DatabaseService],
  exports: [DatabaseService, MongooseModule],
})
export class DatabaseModule {}


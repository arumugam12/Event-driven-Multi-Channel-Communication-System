import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MessageLog } from './schemas/MessageLog.schema';
import { UserContext } from './schemas/UserContext.schema';

@Injectable()
export class DatabaseService {
  constructor(
    @InjectModel(MessageLog.name)
    private messageLogModel: Model<MessageLog>,
    @InjectModel(UserContext.name)
    private userContextModel: Model<UserContext>,
  ) {}

  // Message Logging
  async logMessage(messageLog: Partial<MessageLog>): Promise<MessageLog> {
    const log = new this.messageLogModel(messageLog);
    return await log.save();
  }

  async getMessageHistory(userId: string, platform: string, limit: number = 10): Promise<MessageLog[]> {
    return await this.messageLogModel
      .find({ userId, platform })
      .sort({ timestamp: -1 })
      .limit(limit)
      .lean();
  }

  // User Context Management
  async getUserContext(userId: string, platform: string): Promise<UserContext | null> {
    return await this.userContextModel.findOne({ userId, platform }).lean();
  }

  async updateUserContext(userId: string, platform: string, context: any): Promise<UserContext> {
    const updated = await this.userContextModel.findOneAndUpdate(
      { userId, platform },
      {
        $set: {
          context,
          lastActivity: new Date(),
        },
        $inc: { messageCount: 1 },
      },
      { upsert: true, new: true },
    );
    return updated.toObject();
  }

  async clearUserContext(userId: string, platform: string): Promise<void> {
    await this.userContextModel.deleteOne({ userId, platform });
  }

  // Analytics
  async getMessageStats(): Promise<{ total: number; byPlatform: any; byDate: any }> {
    const total = await this.messageLogModel.countDocuments();

    const byPlatform = await this.messageLogModel.aggregate([
      { $group: { _id: '$platform', count: { $sum: 1 } } },
      { $project: { platform: '$_id', count: 1, _id: 0 } },
    ]);

    const byDate = await this.messageLogModel.aggregate([
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } }, count: { $sum: 1 } } },
      { $project: { date: '$_id', count: 1, _id: 0 } },
      { $sort: { date: -1 } },
      { $limit: 30 },
    ]);

    return { total, byPlatform, byDate };
  }
}


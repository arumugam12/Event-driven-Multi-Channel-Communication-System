import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue, Job } from 'bull';
import { QUEUE_NAMES } from '../common/constants';

export interface MessageProcessingJob {
  messageId: string;
  userId: string;
  platform: string;
  message: string;
  metadata: any;
  timestamp: Date;
}

export interface AIResponseJob {
  messageId: string;
  userId: string;
  platform: string;
  message: string;
  context: any;
  metadata: any;
}

export interface MessageDeliveryJob {
  messageId: string;
  userId: string;
  platform: string;
  response: string;
  metadata: any;
}

@Injectable()
export class QueueService {
  constructor(
    @InjectQueue(QUEUE_NAMES.MESSAGE_PROCESSING)
    private messageProcessingQueue: Queue<MessageProcessingJob>,
    @InjectQueue(QUEUE_NAMES.AI_RESPONSE)
    private aiResponseQueue: Queue<AIResponseJob>,
    @InjectQueue(QUEUE_NAMES.MESSAGE_DELIVERY)
    private messageDeliveryQueue: Queue<MessageDeliveryJob>,
  ) {}

  // Add message to processing queue
  async addMessageProcessingJob(jobData: MessageProcessingJob): Promise<Job<MessageProcessingJob>> {
    return await this.messageProcessingQueue.add('process-message', jobData, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
      removeOnComplete: 10,
      removeOnFail: 5,
    });
  }

  // Add AI response generation job
  async addAIResponseJob(jobData: AIResponseJob): Promise<Job<AIResponseJob>> {
    return await this.aiResponseQueue.add('generate-response', jobData, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
      removeOnComplete: 10,
      removeOnFail: 5,
    });
  }

  // Add message delivery job
  async addMessageDeliveryJob(jobData: MessageDeliveryJob): Promise<Job<MessageDeliveryJob>> {
    return await this.messageDeliveryQueue.add('deliver-message', jobData, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
      removeOnComplete: 10,
      removeOnFail: 5,
    });
  }

  // Queue monitoring methods
  async getQueueStats() {
    const [messageProcessing, aiResponse, messageDelivery] = await Promise.all([
      this.messageProcessingQueue.getJobCounts(),
      this.aiResponseQueue.getJobCounts(),
      this.messageDeliveryQueue.getJobCounts(),
    ]);

    return {
      messageProcessing,
      aiResponse,
      messageDelivery,
    };
  }

  async getFailedJobs() {
    const [messageProcessing, aiResponse, messageDelivery] = await Promise.all([
      this.messageProcessingQueue.getFailed(),
      this.aiResponseQueue.getFailed(),
      this.messageDeliveryQueue.getFailed(),
    ]);

    return {
      messageProcessing,
      aiResponse,
      messageDelivery,
    };
  }

  async retryFailedJob(queueName: string, jobId: string): Promise<void> {
    let queue: Queue;
    
    switch (queueName) {
      case QUEUE_NAMES.MESSAGE_PROCESSING:
        queue = this.messageProcessingQueue;
        break;
      case QUEUE_NAMES.AI_RESPONSE:
        queue = this.aiResponseQueue;
        break;
      case QUEUE_NAMES.MESSAGE_DELIVERY:
        queue = this.messageDeliveryQueue;
        break;
      default:
        throw new Error(`Unknown queue: ${queueName}`);
    }

    const job = await queue.getJob(jobId);
    if (job) {
      await job.retry();
    }
  }

  async clearQueue(queueName: string): Promise<void> {
    let queue: Queue;
    
    switch (queueName) {
      case QUEUE_NAMES.MESSAGE_PROCESSING:
        queue = this.messageProcessingQueue;
        break;
      case QUEUE_NAMES.AI_RESPONSE:
        queue = this.aiResponseQueue;
        break;
      case QUEUE_NAMES.MESSAGE_DELIVERY:
        queue = this.messageDeliveryQueue;
        break;
      default:
        throw new Error(`Unknown queue: ${queueName}`);
    }

    await queue.empty();
  }
}


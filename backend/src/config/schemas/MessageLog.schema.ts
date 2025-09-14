import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type MessageLogDocument = HydratedDocument<MessageLog>;

@Schema({ collection: 'message_logs', timestamps: { createdAt: 'timestamp', updatedAt: 'processedAt' } })
export class MessageLog {
	@Prop({ type: String, required: true })
	userId: string;

	@Prop({ type: String, required: true, index: true })
	platform: string; // 'telegram', 'whatsapp', 'instagram', etc.

	@Prop({ type: String })
	incomingMessage: string;

	@Prop({ type: String })
	outgoingMessage: string;

	@Prop({ type: Object })
	metadata: any; // Store platform-specific data

	@Prop({ type: String, default: 'pending', index: true })
	status: 'pending' | 'processing' | 'completed' | 'failed';

	@Prop({ type: String })
	errorMessage: string;

	@Prop({ type: Number, default: 0 })
	retryCount: number;

	@Prop({ type: Number })
	processingTimeMs: number;
}

export const MessageLogSchema = SchemaFactory.createForClass(MessageLog);
MessageLogSchema.index({ userId: 1, platform: 1 });
MessageLogSchema.index({ timestamp: -1 });


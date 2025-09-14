import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type UserContextDocument = HydratedDocument<UserContext>;

@Schema({ collection: 'user_contexts', timestamps: true })
export class UserContext {
	@Prop({ type: String, required: true, index: true })
	userId: string;

	@Prop({ type: String, required: true, index: true })
	platform: string;

	@Prop({ type: Object, required: true })
	context: any; // Store conversation context, preferences, etc.

	@Prop({ type: Number, default: 0 })
	messageCount: number;

	@Prop({ type: Date })
	lastActivity: Date;
}

export const UserContextSchema = SchemaFactory.createForClass(UserContext);
UserContextSchema.index({ userId: 1, platform: 1 }, { unique: true });


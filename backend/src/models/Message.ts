import mongoose, { Document, Schema } from 'mongoose';

export interface IMessage extends Document {
  leadId: Schema.Types.ObjectId;
  salesUserId: Schema.Types.ObjectId;
  direction: 'outbound' | 'inbound';
  subject: string;
  body: string;
  aiClassification: 'Contacted' | 'Qualified' | 'Lost' | 'Pending';
  createdAt: Date;
  updatedAt: Date;
}

const MessageSchema = new Schema<IMessage>(
  {
    leadId: {
      type: Schema.Types.ObjectId,
      ref: 'Lead',
      required: true,
    },
    salesUserId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    direction: {
      type: String,
      enum: ['outbound', 'inbound'],
      required: true,
    },
    subject: {
      type: String,
      required: true,
    },
    body: {
      type: String,
      required: true,
    },
    aiClassification: {
      type: String,
      enum: ['Contacted', 'Qualified', 'Lost', 'Pending'],
      default: 'Pending',
    },
  },
  { timestamps: true }
);

MessageSchema.index({ leadId: 1 });
MessageSchema.index({ salesUserId: 1 });
MessageSchema.index({ direction: 1 });
MessageSchema.index({ createdAt: -1 });

export default mongoose.model<IMessage>('Message', MessageSchema);
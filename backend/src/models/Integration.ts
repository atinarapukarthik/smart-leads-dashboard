import mongoose, { Document, Schema } from 'mongoose';

export interface IIntegration extends Document {
  userId: Schema.Types.ObjectId;
  gmailAddress: string;
  accessToken: string;
  refreshToken: string;
  expiryDate: number;
  inboxLastSync?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const IntegrationSchema = new Schema<IIntegration>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    gmailAddress: {
      type: String,
      required: true,
    },
    accessToken: {
      type: String,
      required: true,
    },
    refreshToken: {
      type: String,
      required: true,
    },
    expiryDate: {
      type: Number,
      required: true,
    },
    inboxLastSync: {
      type: Date,
    },
  },
  { timestamps: true }
);

// Index already created by unique: true above

export default mongoose.model<IIntegration>('Integration', IntegrationSchema);
import mongoose, { Document, Schema } from 'mongoose';

export interface IMetric extends Document {
  salesUserId: Schema.Types.ObjectId;
  emailsSent: number;
  repliesReceived: number;
  leadsQualified: number;
  leadsLost: number;
  lastActive: Date;
  createdAt: Date;
  updatedAt: Date;
}

const MetricSchema = new Schema<IMetric>(
  {
    salesUserId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    emailsSent: {
      type: Number,
      default: 0,
    },
    repliesReceived: {
      type: Number,
      default: 0,
    },
    leadsQualified: {
      type: Number,
      default: 0,
    },
    leadsLost: {
      type: Number,
      default: 0,
    },
    lastActive: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

export default mongoose.model<IMetric>('Metric', MetricSchema);
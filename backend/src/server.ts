import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import authRoutes from './routes/authRoutes';
import leadRoutes from './routes/leadRoutes';
import emailRoutes from './routes/emailRoutes';
import analyticsRoutes from './routes/analyticsRoutes';
import errorHandler from './middleware/errorHandler';

import './models/Integration';
import './models/Message';
import './models/Metric';

const app = express();
const PORT = process.env.PORT || 5000;

const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/leads', leadRoutes);
app.use('/api/email', emailRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/webhooks', emailRoutes);

app.use(errorHandler as any);

const connectWithRetry = async () => {
  const maxRetries = 5;
  const retryDelay = 3000;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await mongoose.connect(process.env.MONGO_URI as string);
      console.log('[DB] Connected to MongoDB');
      return;
    } catch (err) {
      console.error(`[DB] Connection attempt ${attempt}/${maxRetries} failed:`, (err as Error).message);
      if (attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, retryDelay));
      } else {
        console.error('[DB] All connection attempts failed. Exiting...');
        process.exit(1);
      }
    }
  }
};

connectWithRetry().then(() => {
  app.listen(PORT, () => {
    console.log(`[SERVER] Running on port ${PORT}`);
  });
});

export default app;

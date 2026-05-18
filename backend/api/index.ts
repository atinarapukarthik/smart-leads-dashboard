process.removeAllListeners('warning');
process.on('warning', (warn) => {
  if (warn.name === 'DeprecationWarning' && warn.message.includes('url.parse')) return;
  console.warn(warn);
});

import { Request, Response } from 'express';
import app from '../src/server';
import mongoose from 'mongoose';

let isConnected = false;

async function connectToDatabase() {
  if (isConnected) {
    return;
  }

  try {
    await mongoose.connect(process.env.MONGO_URI as string);
    isConnected = true;
    console.log('[DB] Connected to MongoDB');
  } catch (error) {
    console.error('[DB] Connection failed:', (error as Error).message);
    throw error;
  }
}

export default async function handler(req: Request, res: Response) {
  await connectToDatabase();
  app(req, res);
}

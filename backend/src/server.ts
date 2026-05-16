import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import authRoutes from './routes/authRoutes';
import leadRoutes from './routes/leadRoutes';
import errorHandler from './middleware/errorHandler';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/leads', leadRoutes);

app.use(errorHandler as any);

mongoose
  .connect(process.env.MONGO_URI as string)
  .then(() => {
    console.log('[DB] Connected to MongoDB');
    app.listen(PORT, () => {
      console.log(`[SERVER] Running on port ${PORT}`);
    });
  })
  .catch((err: Error) => {
    console.error('[DB] Connection failed:', err.message);
    process.exit(1);
  });

export default app;

import { Request, Response, NextFunction } from 'express';

declare global {
  namespace Express {
    interface Request {
      user: {
        id: string;
        role: string;
      };
    }
  }
}

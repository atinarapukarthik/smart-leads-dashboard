import { Request, Response } from 'express';
import app from '../src/server';

export default async function handler(req: Request, res: Response) {
  app(req, res);
}

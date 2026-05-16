import { Router, Request, Response } from 'express';
import authenticateToken from '../middleware/auth';
import {
  generateDraft,
  sendEmail,
  processInboundEmail,
  initiateGoogleOAuth,
  handleGoogleCallback,
  getIntegrationStatus,
} from '../controllers/emailController';

const router = Router();

router.post('/generate-draft', authenticateToken, (req: Request, res: Response) => generateDraft(req, res));
router.post('/send', authenticateToken, (req: Request, res: Response) => sendEmail(req, res));
router.post('/webhooks/inbound-email', (req: Request, res: Response) => processInboundEmail(req, res));
router.get('/google/init', authenticateToken, (req: Request, res: Response) => initiateGoogleOAuth(req, res));
router.get('/google/callback', (req: Request, res: Response) => handleGoogleCallback(req, res));
router.get('/status', authenticateToken, (req: Request, res: Response) => getIntegrationStatus(req, res));

export default router;
import { Router, Request, Response } from 'express';
import authenticateToken from '../middleware/auth';
import Message from '../models/Message';
import {
  generateDraft,
  sendEmail,
  processInboundEmail,
  checkInbox,
  getInboundSummary,
  initiateGoogleOAuth,
  handleGoogleCallback,
  getIntegrationStatus,
} from '../controllers/emailController';

const router = Router();

router.post('/generate-draft', authenticateToken, (req: Request, res: Response) => generateDraft(req, res));
router.post('/send', authenticateToken, (req: Request, res: Response) => sendEmail(req, res));
router.post('/webhooks/inbound-email', (req: Request, res: Response) => processInboundEmail(req, res));
router.post('/check-inbox', authenticateToken, (req: Request, res: Response) => checkInbox(req, res));
router.get('/inbound-summary', authenticateToken, (req: Request, res: Response) => getInboundSummary(req, res));
router.get('/google/init', authenticateToken, (req: Request, res: Response) => initiateGoogleOAuth(req, res));
router.get('/google/callback', (req: Request, res: Response) => handleGoogleCallback(req, res));
router.get('/status', authenticateToken, (req: Request, res: Response) => getIntegrationStatus(req, res));

// Get messages for a specific lead
router.get('/messages/:leadId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { leadId } = req.params;
    const messages = await Message.find({ leadId }).sort({ createdAt: 1 });
    res.json({ success: true, data: messages });
  } catch (error) {
    console.error('[MESSAGES] Get error:', (error as Error).message);
    res.status(500).json({ success: false, message: 'Failed to get messages' });
  }
});

export default router;
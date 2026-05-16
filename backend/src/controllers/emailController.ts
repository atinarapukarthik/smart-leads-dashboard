import { Request, Response, NextFunction } from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import Lead from '../models/Lead';
import Message from '../models/Message';
import Metric from '../models/Metric';
import Integration from '../models/Integration';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export const generateDraft = async (req: Request, res: Response, _next?: NextFunction): Promise<void> => {
  try {
    const { leadId } = req.body;

    if (!leadId) {
      res.status(400).json({ success: false, message: 'Lead ID is required' });
      return;
    }

    const lead = await Lead.findById(leadId);

    if (!lead) {
      res.status(404).json({ success: false, message: 'Lead not found' });
      return;
    }

    const model = genAI.getGenerativeModel({ model: 'gemma-2-2b' });

    const prompt = `You are a sales assistant helping a sales representative write a professional introductory email to a potential lead.

Lead Information:
- Name: ${lead.name}
- Email: ${lead.email}
- Source: ${lead.source}
- Current Status: ${lead.status}

Write a professional, concise introductory sales email (150-200 words) that:
1. Has a clear subject line (prefix with "Subject: ")
2. Introduces the sender briefly
3. Explains why the recipient might be interested
4. Includes a clear call-to-action (e.g., schedule a demo, reply to learn more)
5. Is friendly but professional

Format your response as:
Subject: [subject line]
---
[email body]`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    res.json({
      success: true,
      data: {
        subject: responseText.split('Subject: ')[1]?.split('\n')[0]?.trim() || 'Quick question',
        body: responseText.split('---')[1]?.trim() || responseText,
      },
    });
  } catch (error) {
    const err = error as Error;
    console.error('[EMAIL] Draft generation error:', err.message);

    const errMsg = err.message || '';
    if (errMsg.includes('API_KEY') || errMsg.includes('network') || errMsg.includes('timeout') || errMsg.includes('403') || errMsg.includes('unregistered')) {
      res.status(503).json({
        success: false,
        code: 'AI_DOWNTIME',
        message: 'AI service unavailable. Please connect Google account in Settings or try again later.',
      });
      return;
    }

    res.status(500).json({ success: false, message: 'Failed to generate draft' });
  }
};

export const sendEmail = async (req: Request, res: Response): Promise<void> => {
  try {
    const { leadId, subject, body } = req.body;

    if (!leadId || !subject || !body) {
      res.status(400).json({ success: false, message: 'Lead ID, subject, and body are required' });
      return;
    }

    const lead = await Lead.findById(leadId);

    if (!lead) {
      res.status(404).json({ success: false, message: 'Lead not found' });
      return;
    }

    const integration = await Integration.findOne({ userId: req.user?.id });

    if (!integration) {
      res.status(401).json({
        success: false,
        message: 'Google account not connected. Please connect your Gmail in Settings.',
      });
      return;
    }

    if (Date.now() > integration.expiryDate) {
      res.status(401).json({
        success: false,
        message: 'Google access token expired. Please reconnect your Gmail in Settings.',
      });
      return;
    }

    const message = new Message({
      leadId,
      salesUserId: req.user?.id,
      direction: 'outbound',
      subject,
      body,
      aiClassification: 'Pending',
    });

    await message.save();

    await Metric.findOneAndUpdate(
      { salesUserId: req.user?.id },
      {
        $inc: { emailsSent: 1 },
        $set: { lastActive: new Date() },
      },
      { upsert: true }
    );

    console.log(`[EMAIL] Simulated send to ${lead.email}: ${subject}`);

    res.json({
      success: true,
      message: 'Email sent successfully',
      data: message,
    });
  } catch (error) {
    const err = error as Error;
    console.error('[EMAIL] Send error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to send email' });
  }
};

export const processInboundEmail = async (req: Request, res: Response): Promise<void> => {
  try {
    const { from, subject, body, leadEmail } = req.body;

    if (!from || !body) {
      res.status(400).json({ success: false, message: 'From and body are required' });
      return;
    }

    const email = leadEmail || from;
    const lead = await Lead.findOne({ email: new RegExp(email, 'i') });

    if (!lead) {
      res.status(404).json({ success: false, message: 'Lead not found for this email address' });
      return;
    }

    const model = genAI.getGenerativeModel({ model: 'gemma-2-2b' });

    const classificationPrompt = `Analyze this email response text from a prospective buyer. Classify the user's explicit intent into exactly one word from these options: 'Qualified' (if requesting demo, setup, or showing clear business interest), 'Lost' (if requesting unsubscribe, stating no budget, or explicitly rejecting communication), or 'Contacted' (if a generic response or out-of-office notification). Return ONLY the single keyword string.

Email body:
${body}`;

    let classification: 'Contacted' | 'Qualified' | 'Lost' = 'Contacted';

    try {
      const result = await model.generateContent(classificationPrompt);
      const responseText = result.response.text().trim().toLowerCase();

      if (responseText.includes('qualified')) {
        classification = 'Qualified';
      } else if (responseText.includes('lost')) {
        classification = 'Lost';
      } else {
        classification = 'Contacted';
      }
    } catch (aiError) {
      console.error('[AI] Classification failed, defaulting to Contacted:', (aiError as Error).message);
    }

    const message = new Message({
      leadId: lead._id,
      salesUserId: (lead as any)._id,
      direction: 'inbound',
      subject: subject || 'Re: Your Inquiry',
      body,
      aiClassification: classification,
    });

    await message.save();

    await Lead.findByIdAndUpdate(lead._id, {
      status: classification,
    });

    const existingMetric = await Metric.findOne({ salesUserId: lead._id });

    if (existingMetric) {
      const updateFields: Record<string, number> = {
        repliesReceived: 1,
      };

      if (classification === 'Qualified') {
        updateFields.leadsQualified = 1;
      } else if (classification === 'Lost') {
        updateFields.leadsLost = 1;
      }

      await Metric.findByIdAndUpdate(existingMetric._id, {
        $inc: updateFields,
        $set: { lastActive: new Date() },
      });
    }

    res.json({
      success: true,
      message: `Inbound email processed. Lead status updated to: ${classification}`,
      data: {
        leadId: lead._id,
        classification,
        messageId: message._id,
      },
    });
  } catch (error) {
    const err = error as Error;
    console.error('[WEBHOOK] Inbound email processing error:', err.message);

    if (err.message.includes('API_KEY') || err.message.includes('network')) {
      res.status(503).json({
        success: false,
        code: 'AI_DOWNTIME',
        message: 'AI classification service temporarily unavailable.',
      });
      return;
    }

    res.status(500).json({ success: false, message: 'Failed to process inbound email' });
  }
};

export const initiateGoogleOAuth = async (req: Request, res: Response): Promise<void> => {
  try {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI;

    if (!clientId || !clientSecret || clientId === 'your_google_client_id_here.apps.googleusercontent.com') {
      res.json({
        success: true,
        mode: 'offline',
        message: 'Google OAuth credentials not configured. Running in Offline Simulator Mode.',
        instructions: 'Use the simulated webhook endpoint to test AI classification: POST /api/webhooks/inbound-email',
      });
      return;
    }

    const scopes = [
      'https://www.googleapis.com/auth/gmail.send',
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/userinfo.email',
    ];

    const token = req.headers.authorization?.replace('Bearer ', '') || '';
    const state = Buffer.from(JSON.stringify({ token })).toString('base64');

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri || '')}&response_type=code&scope=${encodeURIComponent(scopes.join(' '))}&access_type=offline&state=${encodeURIComponent(state)}`;

    res.json({
      success: true,
      mode: 'live',
      authUrl,
    });
  } catch (error) {
    const err = error as Error;
    console.error('[OAUTH] Init error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to initialize Google OAuth' });
  }
};

export const handleGoogleCallback = async (req: Request, res: Response): Promise<void> => {
  try {
    const { code, state } = req.query;

    let token = '';
    if (state) {
      try {
        const stateObj = JSON.parse(Buffer.from(state as string, 'base64').toString());
        token = stateObj.token;
      } catch {
        console.log('[OAUTH] Could not parse state');
      }
    }

    if (!code) {
      res.redirect('http://localhost:5173/dashboard?tab=email&error=no_code');
      return;
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI;

    if (!clientId || !clientSecret) {
      res.redirect('http://localhost:5173/dashboard?tab=email&error=missing_credentials');
      return;
    }

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code: code as string,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri || '',
        grant_type: 'authorization_code',
      }),
    });

    const tokens = await tokenResponse.json() as any;

    if (tokens.error) {
      console.error('[OAUTH] Token error:', tokens.error);
      res.redirect('http://localhost:5173/dashboard?tab=email&error=token_failed');
      return;
    }

    const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });

    const userInfo = await userInfoResponse.json() as any;

    console.log('[OAUTH] Connected:', userInfo.email);

    if (token) {
      const jwt = require('jsonwebtoken');
      const decoded = jwt.verify(token, process.env.JWT_SECRET) as { id: string };
      const userId = decoded.id;

      await Integration.findOneAndUpdate(
        { userId },
        {
          userId,
          gmailAddress: userInfo.email,
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          expiryDate: Date.now() + (tokens.expires_in || 3600) * 1000,
        },
        { upsert: true }
      );
      console.log('[OAUTH] Integration saved for user:', userId);
    }

    res.redirect('http://localhost:5173/dashboard?tab=email&success=google_connected');
  } catch (error) {
    const err = error as Error;
    console.error('[OAUTH] Callback error:', err.message);
    res.redirect('http://localhost:5173/dashboard?tab=email&error=callback_failed');
  }
};

export const getIntegrationStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const integration = await Integration.findOne({ userId: req.user?.id });

    if (!integration) {
      res.json({ success: true, connected: false });
      return;
    }

    const isExpired = Date.now() > integration.expiryDate;

    res.json({
      success: true,
      connected: !isExpired,
      gmailAddress: integration.gmailAddress,
      expiryDate: integration.expiryDate,
    });
  } catch (error) {
    const err = error as Error;
    console.error('[INTEGRATION] Status error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to get integration status' });
  }
};
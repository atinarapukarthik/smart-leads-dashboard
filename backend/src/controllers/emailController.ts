import { Request, Response, NextFunction } from 'express';
import Lead from '../models/Lead';
import Message from '../models/Message';
import Metric from '../models/Metric';
import Integration from '../models/Integration';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash';

async function refreshGoogleToken(integration: typeof Integration.prototype): Promise<{ accessToken: string; expiresIn: number } | null> {
  try {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID || '',
        client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
        refresh_token: integration.refreshToken,
        grant_type: 'refresh_token',
      }),
    });

    if (!response.ok) {
      console.error('[TOKEN] Refresh failed:', await response.text());
      return null;
    }

    const tokens = await response.json() as { access_token: string; expires_in: number };
    return { accessToken: tokens.access_token, expiresIn: tokens.expires_in };
  } catch (err) {
    console.error('[TOKEN] Refresh error:', (err as Error).message);
    return null;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function callGemini(
  prompt: string,
  options?: { model?: string; maxRetries?: number },
): Promise<string> {
  const model = options?.model || GEMINI_MODEL;
  const maxRetries = options?.maxRetries ?? 3;

  if (!GEMINI_API_KEY) {
    throw new Error('AI_DISABLED');
  }

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        if (res.status === 429) {
          throw new Error(`Gemini rate limited: ${errText}`);
        }
        throw new Error(`Gemini returned status ${res.status}: ${errText}`);
      }

      const data = await res.json() as {
        candidates?: Array<{ content?: { parts?: Array<{ text: string }> } }>;
      };

      if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
        throw new Error('Gemini returned empty response');
      }

      return data.candidates[0].content.parts[0].text;
    } catch (err) {
      lastError = err as Error;
      const msg = lastError.message.toLowerCase();
      const isRateLimit = msg.includes('429') || msg.includes('rate limit');
      const isConnError = msg.includes('fetch failed') || msg.includes('network') || msg.includes('econnrefused');

      if (isRateLimit && attempt < maxRetries) {
        const delay = Math.min(2000 * Math.pow(2, attempt) + Math.random() * 1000, 30000);
        console.log(`[AI] Gemini rate limited (attempt ${attempt}/${maxRetries}), retrying in ${Math.round(delay)}ms`);
        await sleep(delay);
        continue;
      }

      if (isConnError) {
        throw new Error('AI_DISABLED');
      }

      if (attempt < maxRetries) {
        const delay = Math.min(1000 * Math.pow(2, attempt) + Math.random() * 500, 10000);
        console.log(`[AI] Gemini error (attempt ${attempt}/${maxRetries}), retrying in ${Math.round(delay)}ms: ${lastError.message}`);
        await sleep(delay);
      }
    }
  }

  throw lastError || new Error('AI call failed after retries');
}

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

    const responseText = await callGemini(prompt);

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

    if (err.message === 'AI_DISABLED') {
      res.status(503).json({
        success: false,
        code: 'AI_DOWNTIME',
        message: 'Ollama is not running. Please start Ollama and try again.',
      });
      return;
    }

    res.status(500).json({ success: false, message: 'Failed to generate draft' });
  }
};

export const sendEmail = async (req: Request, res: Response): Promise<void> => {
  try {
    const { leadId, toEmail, subject, body } = req.body;

    if (!leadId || !subject || !body) {
      res.status(400).json({ success: false, message: 'Lead ID, subject, and body are required' });
      return;
    }

    const lead = await Lead.findById(leadId);

    if (!lead) {
      res.status(404).json({ success: false, message: 'Lead not found' });
      return;
    }

    const recipientEmail = toEmail || lead.email;

    const integration = await Integration.findOne({ userId: req.user?.id });

    if (!integration) {
      res.status(401).json({
        success: false,
        message: 'Google account not connected. Please connect your Gmail in Settings.',
      });
      return;
    }

    let accessToken = integration.accessToken;

    if (Date.now() > integration.expiryDate - 60000) {
      const refreshed = await refreshGoogleToken(integration);
      if (refreshed) {
        accessToken = refreshed.accessToken;
        await Integration.findByIdAndUpdate(integration._id, {
          accessToken: refreshed.accessToken,
          expiryDate: Date.now() + refreshed.expiresIn * 1000,
        });
        console.log('[TOKEN] Access token refreshed successfully');
      } else {
        res.status(401).json({
          success: false,
          message: 'Google access token expired. Please reconnect your Gmail in Settings.',
        });
        return;
      }
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

    // Actually send the email via Gmail API
    let emailSent = false;
    try {
      const emailContent = [
        `To: ${recipientEmail}`,
        `Subject: ${subject}`,
        'Content-Type: text/plain; charset=utf-8',
        '',
        body,
      ].join('\n');

      const encodedEmail = Buffer.from(emailContent).toString('base64url');

      console.log('[EMAIL] Attempting to send to:', recipientEmail);
      console.log('[EMAIL] Using accessToken:', accessToken.substring(0, 20) + '...');

      const gmailResponse = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          raw: encodedEmail,
        }),
      });

      const responseText = await gmailResponse.text();
      console.log('[EMAIL] Gmail response status:', gmailResponse.status);
      console.log('[EMAIL] Gmail response body:', responseText);

      if (!gmailResponse.ok) {
        const errorData = JSON.parse(responseText);
        console.error('[EMAIL] Gmail API error:', errorData);
        res.status(400).json({
          success: false,
          message: `Gmail API error: ${errorData.error?.message || 'Unknown error'}`,
        });
        return;
      } else {
        const gmailResult = JSON.parse(responseText);
        console.log(`[EMAIL] Sent to ${recipientEmail}: ${gmailResult.id}`);
        message.gmailMessageId = gmailResult.id;
        await message.save();
        
        // Update lead status to Contacted
        await Lead.findByIdAndUpdate(leadId, { status: 'Contacted' });
        console.log(`[LEAD] Status updated to Contacted for lead ${leadId}`);
        
        emailSent = true;
      }
    } catch (gmailError) {
      console.error('[EMAIL] Gmail send error:', (gmailError as Error).message);
      res.status(500).json({
        success: false,
        message: 'Failed to send email via Gmail',
      });
      return;
    }

    res.json({
      success: true,
      message: emailSent ? 'Email sent successfully' : 'Email draft saved (Gmail send failed)',
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

    const classificationPrompt = `Analyze this email response text from a prospective buyer. Classify the user's explicit intent into exactly one word from these options: 'Qualified' (if requesting demo, setup, or showing clear business interest), 'Lost' (if requesting unsubscribe, stating no budget, or explicitly rejecting communication), or 'Contacted' (if a generic response or out-of-office notification). Return ONLY the single keyword string.

Email body:
${body}`;

    let classification: 'Contacted' | 'Qualified' | 'Lost' = 'Contacted';

    try {
      const responseText = (await callGemini(classificationPrompt)).trim().toLowerCase();

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

    if (err.message === 'AI_DISABLED') {
      res.status(503).json({
        success: false,
        code: 'AI_DOWNTIME',
        message: 'AI classification service temporarily unavailable (Ollama not running).',
      });
      return;
    }

    res.status(500).json({ success: false, message: 'Failed to process inbound email' });
  }
};

interface GmailPayloadPart {
  mimeType: string;
  body: { data?: string; size: number };
  parts?: GmailPayloadPart[];
}

interface GmailMessage {
  id: string;
  threadId: string;
  payload: {
    mimeType: string;
    headers: Array<{ name: string; value: string }>;
    body: { data?: string; size: number };
    parts?: GmailPayloadPart[];
  };
  internalDate: string;
}

function extractEmailFromHeader(headerValue: string): string | null {
  const match = headerValue.match(/<([^>]+)>/);
  const email = match ? match[1] : headerValue;
  const trimmed = email.trim().toLowerCase();
  return trimmed || null;
}

function extractGmailBody(payload: GmailMessage['payload']): string {
  function decodeBase64(data: string): string {
    return Buffer.from(data, 'base64').toString('utf-8');
  }

  function searchParts(parts: GmailPayloadPart[]): string {
    for (const part of parts) {
      if (part.mimeType === 'text/plain' && part.body.data) {
        return decodeBase64(part.body.data);
      }
      if (part.parts) {
        const found = searchParts(part.parts);
        if (found) return found;
      }
    }
    return '';
  }

  if (payload.body.data) {
    return decodeBase64(payload.body.data);
  }

  if (payload.parts) {
    return searchParts(payload.parts);
  }

  return '';
}

export const checkInbox = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;

    const integration = await Integration.findOne({ userId });
    if (!integration) {
      res.status(401).json({ success: false, message: 'Google account not connected.' });
      return;
    }

    let accessToken = integration.accessToken;

    if (Date.now() > integration.expiryDate - 60000) {
      const refreshed = await refreshGoogleToken(integration);
      if (refreshed) {
        accessToken = refreshed.accessToken;
        await Integration.findByIdAndUpdate(integration._id, {
          accessToken: refreshed.accessToken,
          expiryDate: Date.now() + refreshed.expiresIn * 1000,
        });
      } else {
        res.status(401).json({ success: false, message: 'Google token expired. Reconnect.' });
        return;
      }
    }

    const allLeads = await Lead.find({
      email: { $nin: [null, ''] },
    }).select('_id email name status');

    if (allLeads.length === 0) {
      res.json({ success: true, data: { newMessages: 0, totalFound: 0 } });
      return;
    }

    const leadByEmail = new Map<string, typeof allLeads[0]>();
    for (const lead of allLeads) {
      leadByEmail.set(lead.email.toLowerCase(), lead);
    }

    const seenGmailIds = await Message.find({
      gmailMessageId: { $exists: true, $ne: null },
    }).select('gmailMessageId');
    const importedSet = new Set(seenGmailIds.map((m) => m.gmailMessageId));

    let newMessages = 0;
    let qualifiedCount = 0;
    let lostCount = 0;
    const errors: string[] = [];
    const leadsWithGmailActivity = new Set<string>();

    const batchMessages: Array<{
      msgData: GmailMessage;
      fromEmail: string | null;
      subject: string;
      body: string;
      receivedDate: Date;
      matchedLead: typeof allLeads[0];
    }> = [];

    const debug: Record<string, unknown> = {
      leadsCount: allLeads.length,
      leadsEmails: allLeads.map(l => l.email),
      alreadyImportedIdsCount: importedSet.size,
      alreadyImportedIds: importedSet.size > 0 ? Array.from(importedSet).slice(0, 10) : [],
      leadResults: [] as Array<{ email: string; found: number; error?: string }>,
    };

    for (const lead of allLeads) {
      const leadDebug: Record<string, unknown> = { email: lead.email, found: 0 };

      const q = encodeURIComponent(`(from:${lead.email} OR to:${lead.email})`);
      const listUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=10&q=${q}`;

      const listRes = await fetch(listUrl, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!listRes.ok) {
        const errBody = await listRes.text().catch(() => '');
        (debug.leadResults as Array<Record<string, unknown>>).push({ ...leadDebug, error: `HTTP ${listRes.status}: ${errBody.substring(0, 100)}` });
        continue;
      }

      const listData = await listRes.json() as {
        messages?: Array<{ id: string; threadId: string }>;
      };

      if (!listData.messages || listData.messages.length === 0) {
        (debug.leadResults as Array<Record<string, unknown>>).push({ ...leadDebug, found: 0 });
        continue;
      }

      leadsWithGmailActivity.add(lead._id.toString());

      const msgDebug: Array<Record<string, unknown>> = [];
      (debug.leadResults as Array<Record<string, unknown>>).push({ ...leadDebug, found: listData.messages.length, msgDebug });

      for (const msgRef of listData.messages) {
        if (importedSet.has(msgRef.id)) {
          msgDebug.push({ id: msgRef.id, skip: 'already_imported' });
          continue;
        }

        try {
          const msgRes = await fetch(
            `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msgRef.id}?format=full`,
            { headers: { Authorization: `Bearer ${accessToken}` } },
          );
            if (!msgRes.ok) {
              msgDebug.push({ id: msgRef.id, skip: 'fetch_failed', status: msgRes.status });
              continue;
            }

            const msgData = await msgRes.json() as GmailMessage;

            const getHeader = (name: string): string =>
              msgData.payload.headers.find((h) => h.name === name)?.value || '';

            const fromEmail = extractEmailFromHeader(getHeader('From'));
            const subject = getHeader('Subject');
            const body = extractGmailBody(msgData.payload);
            const receivedDate = new Date(parseInt(msgData.internalDate, 10) || Date.now());
            const inReplyTo = getHeader('In-Reply-To') || undefined;

            const matchedLead = leadByEmail.get(lead.email.toLowerCase());
            if (!matchedLead) {
              msgDebug.push({ id: msgRef.id, skip: 'lead_not_found_in_map' });
              continue;
            }

          importedSet.add(msgRef.id);
          batchMessages.push({ msgData, fromEmail, subject, body, receivedDate, matchedLead });
          newMessages++;
        } catch {
          // skip failed message
        }
      }
    }

    const classifications = new Map<string, 'Contacted' | 'Qualified' | 'Lost'>();

    if (batchMessages.length > 0) {
      const batchPrompt = `You are classifying email replies from prospective buyers. For each email below (separated by "---"), classify the sender's intent into exactly one category:
- Qualified: requesting demo, setup, pricing, or showing clear business interest
- Lost: requesting unsubscribe, stating no budget, explicitly rejecting
- Contacted: generic response, out-of-office, or unclear

Respond with a JSON object where keys are "email_0", "email_1", etc., and values are one of "Qualified", "Lost", or "Contacted". Return ONLY valid JSON, no other text.

${batchMessages.map((m, i) => `email_${i}:\nFrom: ${m.fromEmail}\nSubject: ${m.subject}\nBody: ${m.body.substring(0, 1000)}`).join('\n---\n')}`;

      try {
        const raw = await callGemini(batchPrompt);
        const parsed = JSON.parse(raw.replace(/```json|```/g, '').trim());
        for (const [key, value] of Object.entries(parsed)) {
          const idx = parseInt(key.replace('email_', ''), 10);
          if (typeof value === 'string' && ['Qualified', 'Lost', 'Contacted'].includes(value)) {
            classifications.set(`email_${idx}`, value as 'Contacted' | 'Qualified' | 'Lost');
          }
        }
      } catch (aiErr) {
        console.error('[INBOX] Batch AI classification failed:', (aiErr as Error).message);
      }
    }

    for (let i = 0; i < batchMessages.length; i++) {
      const { msgData, subject, body, receivedDate, matchedLead } = batchMessages[i];
      const classification = classifications.get(`email_${i}`) || 'Contacted';

      try {
        await Message.create({
          leadId: matchedLead._id,
          salesUserId: userId,
          direction: 'inbound',
          subject,
          body,
          aiClassification: classification,
          gmailMessageId: msgData.id,
          createdAt: receivedDate,
        });

        await Lead.findByIdAndUpdate(matchedLead._id, { status: classification });

        if (classification === 'Qualified') qualifiedCount++;
        if (classification === 'Lost') lostCount++;
      } catch (storeErr) {
        errors.push(`Failed to store message ${msgData.id}: ${(storeErr as Error).message}`);
      }
    }

    if (leadsWithGmailActivity.size > 0) {
      await Lead.updateMany(
        { _id: { $in: Array.from(leadsWithGmailActivity) }, status: 'New' },
        { $set: { status: 'Contacted' } },
      );
    }

    if (newMessages > 0) {
      const metricUpdate: Record<string, number> = {
        repliesReceived: newMessages,
      };
      if (qualifiedCount > 0) metricUpdate.leadsQualified = qualifiedCount;
      if (lostCount > 0) metricUpdate.leadsLost = lostCount;

      await Metric.findOneAndUpdate(
        { salesUserId: userId },
        {
          $inc: metricUpdate,
          $set: { lastActive: new Date() },
        },
        { upsert: true },
      );
    }

    await Integration.findByIdAndUpdate(integration._id, { inboxLastSync: new Date() });

    res.json({
      success: true,
      data: {
        newMessages,
        totalFound: batchMessages.length,
        errors: errors.length > 0 ? errors : undefined,
        debug,
      },
    });
  } catch (error) {
    const err = error as Error;
    console.error('[INBOX] Check error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to check inbox' });
  }
};

export const getInboundSummary = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;

    const results = await Message.aggregate([
      { $match: { salesUserId: userId, direction: 'inbound' } },
      { $group: { _id: '$leadId', count: { $sum: 1 }, lastReceived: { $max: '$createdAt' } } },
    ]);

    const summary: Record<string, { count: number; lastReceived: string }> = {};
    for (const r of results) {
      summary[r._id.toString()] = { count: r.count, lastReceived: r.lastReceived };
    }

    res.json({ success: true, data: summary });
  } catch (error) {
    const err = error as Error;
    console.error('[INBOX] Summary error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to get inbound summary' });
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
  const { code, state } = req.query;
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

  let token = '';
  if (state) {
    try {
      const stateObj = JSON.parse(Buffer.from(state as string, 'base64').toString());
      token = stateObj.token;
    } catch {
      console.log('[OAUTH] Could not parse state');
    }
  }

  try {

    if (!code) {
      const redirectUrl = token 
        ? `${frontendUrl}/dashboard?tab=email&error=no_code&token=${token}`
        : `${frontendUrl}/dashboard?tab=email&error=no_code`;
      res.redirect(redirectUrl);
      return;
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI;

    if (!clientId || !clientSecret) {
      const redirectUrl = token 
        ? `${frontendUrl}/dashboard?tab=email&error=missing_credentials&token=${token}`
        : `${frontendUrl}/dashboard?tab=email&error=missing_credentials`;
      res.redirect(redirectUrl);
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
      const redirectUrl = token 
        ? `${frontendUrl}/dashboard?tab=email&error=token_failed&token=${token}`
        : `${frontendUrl}/dashboard?tab=email&error=token_failed`;
      res.redirect(redirectUrl);
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

    const redirectUrl = token 
      ? `${frontendUrl}/dashboard?tab=email&success=google_connected&token=${token}`
      : `${frontendUrl}/dashboard?tab=email&success=google_connected`;
    
    res.redirect(redirectUrl);
  } catch (error) {
    const err = error as Error;
    console.error('[OAUTH] Callback error:', err.message);
    const redirectUrl = token 
      ? `${frontendUrl}/dashboard?tab=email&error=callback_failed&token=${token}`
      : `${frontendUrl}/dashboard?tab=email&error=callback_failed`;
    res.redirect(redirectUrl);
  }
};

export const getIntegrationStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    console.log('[INTEGRATION] Status check for userId:', userId);
    
    const integration = await Integration.findOne({ userId });
    console.log('[INTEGRATION] Found integration:', integration ? 'yes' : 'no');

    if (!integration) {
      res.json({ success: true, connected: false });
      return;
    }

    const isExpired = Date.now() > integration.expiryDate;
    console.log('[INTEGRATION] Token expired:', isExpired);

    // Test token validity with Gmail API
    let tokenValid = false;
    if (!isExpired) {
      try {
        const testResponse = await fetch('https://www.googleapis.com/gmail/v1/users/me/profile', {
          headers: { 'Authorization': `Bearer ${integration.accessToken}` },
        });
        tokenValid = testResponse.ok;
        if (!tokenValid) {
          console.log('[INTEGRATION] Token test failed:', testResponse.status);
        }
      } catch (e) {
        console.log('[INTEGRATION] Token test error:', (e as Error).message);
      }
    }

    res.json({
      success: true,
      connected: !isExpired && tokenValid,
      gmailAddress: integration.gmailAddress,
      expiryDate: integration.expiryDate,
    });
  } catch (error) {
    const err = error as Error;
    console.error('[INTEGRATION] Status error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to get integration status' });
  }
};
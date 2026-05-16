import apiClient from './client';

interface EmailDraftResponse {
  success: boolean;
  data?: {
    subject: string;
    body: string;
  };
  code?: string;
  message?: string;
}

interface SendEmailPayload {
  leadId: string;
  subject: string;
  body: string;
}

interface SendEmailResponse {
  success: boolean;
  message?: string;
  data?: Record<string, unknown>;
}

interface IntegrationStatusResponse {
  success: boolean;
  connected?: boolean;
  gmailAddress?: string;
  expiryDate?: number;
  mode?: string;
  authUrl?: string;
}

interface GoogleOAuthInitResponse {
  success: boolean;
  mode: 'offline' | 'live';
  message?: string;
  authUrl?: string;
  instructions?: string;
}

export const generateDraft = async (leadId: string): Promise<EmailDraftResponse> => {
  const response = await apiClient.post<EmailDraftResponse>('/email/generate-draft', { leadId });
  return response.data;
};

export const sendEmail = async (data: SendEmailPayload): Promise<SendEmailResponse> => {
  const response = await apiClient.post<SendEmailResponse>('/email/send', data);
  return response.data;
};

export const getIntegrationStatus = async (): Promise<IntegrationStatusResponse> => {
  const response = await apiClient.get<IntegrationStatusResponse>('/email/status');
  return response.data;
};

export const initiateGoogleOAuth = async (): Promise<GoogleOAuthInitResponse> => {
  const response = await apiClient.get<GoogleOAuthInitResponse>('/email/google/init');
  return response.data;
};

export const processInboundEmail = async (data: {
  from: string;
  subject?: string;
  body: string;
  leadEmail?: string;
}): Promise<{ success: boolean; data?: { leadId: string; classification: string } }> => {
  const response = await apiClient.post('/email/webhooks/inbound-email', data);
  return response.data;
};
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
  toEmail: string;
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

export interface MessageData {
  _id: string;
  leadId: string;
  salesUserId: string;
  direction: 'outbound' | 'inbound';
  subject: string;
  body: string;
  aiClassification: 'Contacted' | 'Qualified' | 'Lost' | 'Pending';
  gmailMessageId?: string;
  createdAt: string;
  updatedAt: string;
}

interface GetMessagesResponse {
  success: boolean;
  data: MessageData[];
}

export const getMessages = async (leadId: string): Promise<GetMessagesResponse> => {
  const response = await apiClient.get<GetMessagesResponse>(`/email/messages/${leadId}`);
  return response.data;
};

interface CheckInboxResponse {
  success: boolean;
  data?: {
    newMessages: number;
    totalFound: number;
    errors?: string[];
    debug?: Record<string, unknown>;
  };
  message?: string;
}

export const checkInbox = async (): Promise<CheckInboxResponse> => {
  const response = await apiClient.post<CheckInboxResponse>('/email/check-inbox');
  return response.data;
};

interface InboundSummaryResponse {
  success: boolean;
  data?: Record<string, { count: number; lastReceived: string }>;
  message?: string;
}

export const getInboundSummary = async (): Promise<InboundSummaryResponse> => {
  const response = await apiClient.get<InboundSummaryResponse>('/email/inbound-summary');
  return response.data;
};
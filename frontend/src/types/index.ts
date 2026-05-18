export type User = {
  _id: string;
  id: string;
  name: string;
  email: string;
  role: 'Admin' | 'Sales User';
};

export type Lead = {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  notes?: string;
  status: 'New' | 'Contacted' | 'Qualified' | 'Lost';
  source: 'Website' | 'Instagram' | 'Referral';
  createdAt: string;
  updatedAt: string;
};

export type Integration = {
  _id: string;
  userId: string;
  gmailAddress: string;
  expiryDate: number;
  createdAt: string;
  updatedAt: string;
};

export type Message = {
  _id: string;
  leadId: string;
  salesUserId: string;
  direction: 'outbound' | 'inbound';
  subject: string;
  body: string;
  aiClassification: 'Contacted' | 'Qualified' | 'Lost' | 'Pending';
  createdAt: string;
  updatedAt: string;
};

export type Metric = {
  _id: string;
  salesUserId: string;
  emailsSent: number;
  repliesReceived: number;
  leadsQualified: number;
  leadsLost: number;
  lastActive: string;
  createdAt: string;
  updatedAt: string;
};

export type SalesPerformance = {
  userId: string;
  name: string;
  email: string;
  emailsSent: number;
  repliesReceived: number;
  leadsQualified: number;
  leadsLost: number;
  lastActive: string | null;
  responseRate: string;
  conversionRate: string;
};

export type RegisterResponse = {
  success: boolean;
  data: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
};

export type AuthResponse = {
  success: boolean;
  data: {
    token: string;
    user: User;
  };
};

export type PaginatedResponse<T> = {
  success: boolean;
  data: T[];
  pagination: {
    totalRecords: number;
    currentPage: number;
    totalPages: number;
    limit: number;
  };
};

export type ApiError = {
  success: false;
  message: string;
  statusCode?: number;
};

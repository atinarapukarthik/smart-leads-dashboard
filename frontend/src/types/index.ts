export type User = {
  id: string;
  name: string;
  email: string;
  role: 'Admin' | 'Sales User';
};

export type Lead = {
  _id: string;
  name: string;
  email: string;
  status: 'New' | 'Contacted' | 'Qualified' | 'Lost';
  source: 'Website' | 'Instagram' | 'Referral';
  createdAt: string;
  updatedAt: string;
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

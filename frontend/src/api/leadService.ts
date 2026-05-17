import apiClient from './client';
import type { Lead, PaginatedResponse } from '../types';

interface LeadQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  source?: string;
  sort?: string;
}

interface LeadCreateData {
  name: string;
  email: string;
  status: 'New' | 'Contacted' | 'Qualified' | 'Lost';
  source: 'Website' | 'Instagram' | 'Referral';
}

export const getLeads = (params: LeadQueryParams) =>
  apiClient.get<PaginatedResponse<Lead>>('/leads', { params });

export const createLead = (data: LeadCreateData) =>
  apiClient.post<{ success: boolean; data: Lead }>('/leads', data);

export const updateLead = (id: string, data: Partial<LeadCreateData>) =>
  apiClient.put<{ success: boolean; data: Lead }>(`/leads/${id}`, data);

export const deleteLead = (id: string) =>
  apiClient.delete<{ success: boolean; message: string }>(`/leads/${id}`);

export const getContactedLeads = () =>
  apiClient.get<{ success: boolean; data: Lead[] }>('/leads/contacted');

export const getNewLeads = () =>
  apiClient.get<PaginatedResponse<Lead>>('/leads', { params: { status: 'New' } });

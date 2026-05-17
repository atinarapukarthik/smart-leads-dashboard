import { useState, useEffect } from 'react';
import type { Lead } from '../../types';
import { getMessages } from '../../api/emailService';

interface MessageData {
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

interface LeadDetailPanelProps {
  lead: Lead;
  onClose: () => void;
  onSendEmail: () => void;
  activeTab: 'overview' | 'email';
  onTabChange: (tab: 'overview' | 'email') => void;
}

export default function LeadDetailPanel({ lead, onClose, onSendEmail, activeTab, onTabChange }: LeadDetailPanelProps) {
  const [messages, setMessages] = useState<MessageData[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);

  useEffect(() => {
    if (activeTab === 'email') {
      loadMessages();
    }
  }, [activeTab, lead._id]);

  const loadMessages = async () => {
    setIsLoadingMessages(true);
    try {
      const res = await getMessages(lead._id);
      if (res.success) {
        setMessages(res.data || []);
      }
    } catch (err) {
      console.error('Failed to load messages:', err);
    } finally {
      setIsLoadingMessages(false);
    }
  };

  const statusColors: Record<string, string> = {
    New: 'bg-blue-100 text-blue-700 ring-blue-600/20',
    Contacted: 'bg-amber-100 text-amber-700 ring-amber-600/20',
    Qualified: 'bg-emerald-100 text-emerald-700 ring-emerald-600/20',
    Lost: 'bg-red-100 text-red-700 ring-red-600/20',
  };

  return (
    <div className="fixed inset-y-0 right-0 w-full max-w-md bg-white shadow-2xl z-40 flex flex-col animate-slide-in-right">
      <div className="border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">Lead Details</h2>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="mt-4 flex gap-2">
          <button
            onClick={() => onTabChange('overview')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'overview'
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => onTabChange('email')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'email'
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Email ({messages.length})
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'overview' ? (
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Contact Info</h3>
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <div>
                  <span className="text-xs text-gray-500 block">Name</span>
                  <span className="text-sm font-medium text-gray-900">{lead.name}</span>
                </div>
                <div>
                  <span className="text-xs text-gray-500 block">Email</span>
                  <span className="text-sm font-medium text-gray-900">{lead.email}</span>
                </div>
                {lead.phone && (
                  <div>
                    <span className="text-xs text-gray-500 block">Phone</span>
                    <span className="text-sm font-medium text-gray-900">{lead.phone}</span>
                  </div>
                )}
                {lead.company && (
                  <div>
                    <span className="text-xs text-gray-500 block">Company</span>
                    <span className="text-sm font-medium text-gray-900">{lead.company}</span>
                  </div>
                )}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Status</h3>
              <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold ring-1 ring-inset ${statusColors[lead.status] ?? 'bg-gray-100 text-gray-700 ring-gray-500/20'}`}>
                {lead.status}
              </span>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Source</h3>
              <span className="text-sm text-gray-900">{lead.source}</span>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Created</h3>
              <span className="text-sm text-gray-900">{new Date(lead.createdAt).toLocaleDateString()}</span>
            </div>

            {lead.notes && (
              <div>
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Notes</h3>
                <p className="text-sm text-gray-900 whitespace-pre-wrap">{lead.notes}</p>
              </div>
            )}
          </div>
        ) : (
          <div>
            <div className="mb-4">
              <button
                onClick={onSendEmail}
                className="w-full btn-primary"
              >
                Send Email
              </button>
            </div>

            {isLoadingMessages ? (
              <div className="text-center py-8">
                <div className="h-6 w-6 mx-auto animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
                <p className="mt-2 text-sm text-gray-500">Loading messages...</p>
              </div>
            ) : messages.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <p>No emails yet</p>
                <p className="text-sm">Send an email to start the conversation</p>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((msg) => (
                  <div
                    key={msg._id}
                    className={`p-4 rounded-lg border ${
                      msg.direction === 'outbound'
                        ? 'border-blue-200 bg-blue-50'
                        : 'border-green-200 bg-green-50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-xs font-medium px-2 py-1 rounded ${
                        msg.direction === 'outbound' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
                      }`}>
                        {msg.direction === 'outbound' ? 'Sent' : 'Received'}
                      </span>
                      <span className="text-xs text-gray-500">
                        {new Date(msg.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <h4 className="font-medium text-gray-900 text-sm">{msg.subject}</h4>
                    <p className="text-sm text-gray-600 mt-1 line-clamp-3">{msg.body}</p>
                    {msg.aiClassification && msg.aiClassification !== 'Pending' && (
                      <div className="mt-2">
                        <span className={`text-xs px-2 py-0.5 rounded ${
                          msg.aiClassification === 'Qualified' ? 'bg-green-100 text-green-700' :
                          msg.aiClassification === 'Lost' ? 'bg-red-100 text-red-700' :
                          msg.aiClassification === 'Contacted' ? 'bg-amber-100 text-amber-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {msg.aiClassification}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
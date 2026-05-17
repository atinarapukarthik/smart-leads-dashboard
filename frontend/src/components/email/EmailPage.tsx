import { useState, useEffect, useCallback, useRef } from 'react';
import { getMessages, checkInbox, getInboundSummary, generateDraft, sendEmail } from '../../api/emailService';
import { getNewLeads } from '../../api/leadService';
import type { Lead } from '../../types';

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

interface EmailPageProps {
  contactedLeads: Lead[];
  googleConnected: boolean;
  onSyncComplete?: () => void;
}

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  const thisYear = d.getFullYear() === now.getFullYear();
  if (thisYear) return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatDateFull(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) return 'Today';
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((p) => p[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

const avatarColors = [
  'bg-blue-500', 'bg-emerald-500', 'bg-violet-500', 'bg-amber-500',
  'bg-rose-500', 'bg-cyan-500', 'bg-indigo-500', 'bg-teal-500'
];

export default function EmailPage({ contactedLeads, googleConnected, onSyncComplete }: EmailPageProps) {
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [messages, setMessages] = useState<MessageData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [inboundSummary, setInboundSummary] = useState<Record<string, { count: number; lastReceived: string }>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [replySubject, setReplySubject] = useState('');
  const [replyBody, setReplyBody] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [replyError, setReplyError] = useState<string | null>(null);
  const [replyAiDowntime, setReplyAiDowntime] = useState(false);

  const [showCompose, setShowCompose] = useState(false);
  const [newLeads, setNewLeads] = useState<Lead[]>([]);
  const [composeLead, setComposeLead] = useState<Lead | null>(null);
  const [composeSubject, setComposeSubject] = useState('');
  const [composeBody, setComposeBody] = useState('');
  const [isComposeGenerating, setIsComposeGenerating] = useState(false);
  const [isComposeSending, setIsComposeSending] = useState(false);
  const [composeError, setComposeError] = useState<string | null>(null);
  const [composeAiDowntime, setComposeAiDowntime] = useState(false);
  const [composeSuccess, setComposeSuccess] = useState(false);

  const loadMessages = useCallback(async () => {
    if (!selectedLead) return;
    setIsLoading(true);
    try {
      const res = await getMessages(selectedLead._id);
      if (res.success) {
        setMessages(res.data || []);
      }
    } catch (err) {
      console.error('Failed to load messages:', err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedLead]);

  useEffect(() => {
    if (selectedLead) {
      loadMessages();
      clearReply();
    }
  }, [selectedLead, loadMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadInboundSummary = useCallback(async () => {
    try {
      const res = await getInboundSummary();
      if (res.success && res.data) {
        setInboundSummary(res.data);
      }
    } catch (err) {
      console.error('Failed to load inbound summary:', err);
    }
  }, []);

  useEffect(() => {
    loadInboundSummary();
  }, [loadInboundSummary]);

  const didAutoSync = useRef(false);
  useEffect(() => {
    if (!googleConnected || didAutoSync.current) return;
    didAutoSync.current = true;
    checkInbox().then((res) => {
      if (res.success) {
        loadInboundSummary();
        onSyncComplete?.();
      }
    }).catch(() => {});
  }, [googleConnected, loadInboundSummary, onSyncComplete]);

  const clearReply = useCallback(() => {
    setReplySubject('');
    setReplyBody('');
    setReplyError(null);
    setReplyAiDowntime(false);
  }, []);

  const clearCompose = useCallback(() => {
    setComposeLead(null);
    setComposeSubject('');
    setComposeBody('');
    setComposeError(null);
    setComposeAiDowntime(false);
    setComposeSuccess(false);
  }, []);

  const openCompose = useCallback(async () => {
    try {
      const res = await getNewLeads();
      if (res.success && res.data) {
        const leads = res.data.data || [];
        setNewLeads(leads);
        if (leads.length > 0) {
          setComposeLead(leads[0]);
        }
      }
    } catch (err) {
      console.error('Failed to fetch new leads:', err);
    }
    setShowCompose(true);
  }, []);

  const handleComposeGenerateDraft = async () => {
    if (!composeLead) return;
    setIsComposeGenerating(true);
    setComposeError(null);
    setComposeAiDowntime(false);

    try {
      const res = await generateDraft(composeLead._id);
      if (res.code === 'AI_DOWNTIME') {
        setComposeAiDowntime(true);
        setComposeError(res.message || 'Email generation service is temporarily blocked.');
      } else if (res.success && res.data) {
        setComposeSubject(res.data.subject);
        setComposeBody(res.data.body);
      } else {
        setComposeError(res.message || 'Failed to generate draft');
      }
    } catch {
      setComposeError('Failed to generate draft. Please try again.');
    } finally {
      setIsComposeGenerating(false);
    }
  };

  const handleComposeSend = async () => {
    if (!composeLead || !composeSubject.trim() || !composeBody.trim()) {
      setComposeError('Please fill in both subject and body');
      return;
    }
    setIsComposeSending(true);
    setComposeError(null);

    try {
      const res = await sendEmail({ leadId: composeLead._id, toEmail: composeLead.email, subject: composeSubject, body: composeBody });
      if (res.success) {
        setComposeSuccess(true);
        onSyncComplete?.();
        setTimeout(() => {
          setShowCompose(false);
          clearCompose();
        }, 1500);
      } else {
        setComposeError(res.message || 'Failed to send email');
      }
    } catch {
      setComposeError('Failed to send email. Please try again.');
    } finally {
      setIsComposeSending(false);
    }
  };

  const handleSyncInbox = async () => {
    setIsSyncing(true);
    setSyncMessage(null);
    try {
      const res = await checkInbox();
      if (res.success) {
        const count = res.data?.newMessages ?? 0;
        if (count > 0) {
          setSyncMessage(`Found ${count} new message${count !== 1 ? 's' : ''}`);
        } else {
          setSyncMessage('No new messages');
        }
        await loadInboundSummary();
        onSyncComplete?.();
        if (selectedLead) await loadMessages();
      } else {
        setSyncMessage(res.message || 'Sync failed');
      }
    } catch {
      setSyncMessage('Sync failed. Try again.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleGenerateReplyDraft = async () => {
    if (!selectedLead) return;
    setIsGenerating(true);
    setReplyError(null);
    setReplyAiDowntime(false);

    try {
      const res = await generateDraft(selectedLead._id);
      if (res.code === 'AI_DOWNTIME') {
        setReplyAiDowntime(true);
        setReplyError(res.message || 'Email generation service is temporarily blocked.');
      } else if (res.success && res.data) {
        const lastMsg = messages[messages.length - 1];
        if (lastMsg && lastMsg.direction === 'inbound') {
          setReplySubject(`Re: ${lastMsg.subject.startsWith('Re:') ? lastMsg.subject.slice(4) : lastMsg.subject}`);
        } else {
          setReplySubject(res.data.subject);
        }
        setReplyBody(res.data.body);
      } else {
        setReplyError(res.message || 'Failed to generate draft');
      }
    } catch {
      setReplyError('Failed to generate draft. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSendReply = async () => {
    if (!selectedLead || !replySubject.trim() || !replyBody.trim()) {
      setReplyError('Please fill in both subject and body');
      return;
    }
    setIsSending(true);
    setReplyError(null);

    try {
      const res = await sendEmail({ leadId: selectedLead._id, toEmail: selectedLead.email, subject: replySubject, body: replyBody });
      if (res.success) {
        clearReply();
        await loadMessages();
      } else {
        setReplyError(res.message || 'Failed to send email');
      }
    } catch {
      setReplyError('Failed to send email. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  const getAvatarColor = (id: string) => avatarColors[parseInt(id.slice(-2), 36) % avatarColors.length];

  const lastMsg = messages.length > 0 ? messages[messages.length - 1] : null;
  const lastInbound = lastMsg && lastMsg.direction === 'inbound' ? lastMsg : null;

  return (
    <div className="flex h-[calc(100vh-64px)] bg-gray-50">
      <div className="w-72 lg:w-80 border-r border-gray-200 bg-white flex flex-col shrink-0">
        <div className="p-3 space-y-2 border-b border-gray-100">
          <button
            onClick={openCompose}
            disabled={!googleConnected}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Compose
          </button>
          <button
            onClick={handleSyncInbox}
            disabled={isSyncing || !googleConnected}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSyncing ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
              </svg>
            )}
            {isSyncing ? 'Syncing...' : 'Sync Inbox'}
          </button>
          {syncMessage && (
            <p className="text-xs text-center text-gray-400 animate-fade-in">{syncMessage}</p>
          )}
        </div>
        <div className="px-4 pt-3 pb-1">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
            Conversations ({contactedLeads.length})
          </p>
        </div>
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          {contactedLeads.length === 0 ? (
            <div className="px-4 py-12 text-center">
              <svg className="w-10 h-10 mx-auto mb-3 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
              <p className="text-sm text-gray-500">No conversations yet</p>
              <p className="text-xs text-gray-400 mt-1">Send an email to get started</p>
            </div>
          ) : (
            contactedLeads.map((lead) => {
              const responseInfo = inboundSummary[lead._id];
              const isActive = selectedLead?._id === lead._id;
              return (
                <button
                  key={lead._id}
                  onClick={() => setSelectedLead(lead)}
                  className={`w-full text-left px-4 py-3.5 border-b border-gray-50 hover:bg-gray-50 transition-colors ${
                    isActive ? 'bg-primary-50 border-l-[3px] border-l-primary-500' : 'border-l-[3px] border-l-transparent'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-full ${getAvatarColor(lead._id)} flex items-center justify-center text-white font-semibold text-sm shrink-0`}>
                      {getInitials(lead.name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className={`font-medium text-sm truncate ${isActive ? 'text-primary-900' : 'text-gray-900'}`}>
                          {lead.name}
                        </span>
                        {responseInfo && (
                          <span className="shrink-0 text-xs text-gray-400">{timeAgo(responseInfo.lastReceived)}</span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 truncate mt-0.5">{lead.email}</p>
                      <p className="text-xs text-gray-400 truncate mt-1">
                        {lead.status === 'Contacted' ? 'Awaiting reply' : lead.status}
                      </p>
                    </div>
                    {responseInfo && responseInfo.count > 0 && (
                      <span className="shrink-0 min-w-[20px] h-5 flex items-center justify-center rounded-full bg-green-500 text-white text-xs font-medium px-1.5">
                        {responseInfo.count}
                      </span>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col bg-white">
        {selectedLead ? (
          <>
            <div className="border-b border-gray-200 px-6 py-4 bg-white shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-10 h-10 rounded-full ${getAvatarColor(selectedLead._id)} flex items-center justify-center text-white font-semibold text-sm shrink-0`}>
                    {getInitials(selectedLead.name)}
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-base font-semibold text-gray-900 truncate">{selectedLead.name}</h2>
                    <p className="text-sm text-gray-500 truncate">{selectedLead.email}</p>
                  </div>
                </div>
                <button
                  onClick={openCompose}
                  disabled={!googleConnected}
                  className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed shadow-sm shrink-0"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  New Email
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto scrollbar-thin bg-gray-50">
              {isLoading ? (
                <div className="flex items-center justify-center py-16">
                  <div className="flex flex-col items-center gap-3">
                    <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-primary-200 border-t-primary-600" />
                    <p className="text-sm text-gray-400">Loading messages...</p>
                  </div>
                </div>
              ) : messages.length === 0 ? (
                <div className="flex items-center justify-center py-16">
                  <div className="text-center">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                      <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <p className="text-gray-500 font-medium">No emails yet</p>
                    <p className="text-sm text-gray-400 mt-1">Start the conversation by sending an email</p>
                    <button
                      onClick={openCompose}
                      className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                      </svg>
                      Send First Email
                    </button>
                  </div>
                </div>
              ) : (
                <div className="py-6 px-4 sm:px-6 max-w-4xl mx-auto space-y-6">
                  {messages.map((msg, idx) => {
                    const isOutbound = msg.direction === 'outbound';
                    const prevMsg = idx > 0 ? messages[idx - 1] : null;
                    const showDateSeparator = idx === 0 || new Date(msg.createdAt).toDateString() !== new Date(messages[idx - 1].createdAt).toDateString();
                    const isFirstOfGroup = idx === 0 || messages[idx - 1].direction !== msg.direction;
                    const sameSender = prevMsg && prevMsg.direction === msg.direction;
                    const isThreadStart = idx === 0 || (msg.subject !== prevMsg?.subject);

                    return (
                      <div key={msg._id}>
                        {showDateSeparator && (
                          <div className="flex items-center gap-3 py-2">
                            <div className="flex-1 h-px bg-gray-200" />
                            <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wider shrink-0 px-2">
                              {formatDateFull(msg.createdAt)}
                            </span>
                            <div className="flex-1 h-px bg-gray-200" />
                          </div>
                        )}

                        <div className={`flex ${isOutbound ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[85%] lg:max-w-[75%] ${isOutbound ? 'order-1' : 'order-1'}`}>
                            {isThreadStart && (
                              <div className={`mb-1 px-1 ${isOutbound ? 'text-right' : 'text-left'}`}>
                                <span className="text-xs font-semibold text-gray-900">
                                  {isOutbound ? 'You' : selectedLead.name}
                                </span>
                                {isOutbound && (
                                  <span className="ml-2 text-xs text-gray-500">to {selectedLead.name}</span>
                                )}
                              </div>
                            )}

                            <div className={`flex gap-3 ${isOutbound ? 'flex-row-reverse' : ''}`}>
                              {!isOutbound && (
                                <div className={`w-8 h-8 rounded-full ${getAvatarColor(msg.leadId)} flex items-center justify-center text-white text-xs font-semibold shrink-0 mt-1 ${sameSender ? 'invisible' : ''}`}>
                                  {getInitials(selectedLead.name)}
                                </div>
                              )}

                              <div className={`flex-1 ${isOutbound ? 'items-end' : 'items-start'} flex flex-col`}>
                                {isThreadStart && msg.subject && (
                                  <div className={`text-xs font-medium text-gray-500 mb-1.5 px-3 ${isOutbound ? 'text-right' : 'text-left'}`}>
                                    {msg.subject}
                                  </div>
                                )}

                                <div
                                  className={`rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap break-words shadow-sm ${
                                    isOutbound
                                      ? 'bg-primary-600 text-white rounded-br-sm'
                                      : 'bg-white text-gray-800 rounded-bl-sm border border-gray-200'
                                  }`}
                                >
                                  {msg.body}
                                </div>

                                <div className={`flex items-center gap-2 mt-1 px-1 ${isOutbound ? 'flex-row-reverse' : ''}`}>
                                  <span className="text-[11px] text-gray-400">{formatDate(msg.createdAt)}</span>
                                  {isOutbound && msg.aiClassification && msg.aiClassification !== 'Pending' && (
                                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                                      msg.aiClassification === 'Qualified' ? 'bg-green-50 text-green-700 border border-green-200' :
                                      msg.aiClassification === 'Lost' ? 'bg-red-50 text-red-700 border border-red-200' :
                                      'bg-amber-50 text-amber-700 border border-amber-200'
                                    }`}>
                                      {msg.aiClassification}
                                    </span>
                                  )}
                                  {isOutbound && (
                                    <svg className="w-3 h-3 text-primary-300" fill="currentColor" viewBox="0 0 20 20">
                                      <path d="M10 2a8 8 0 100 16 8 8 0 000-16zm3.5 5.5l-5 5a.5.5 0 01-.7 0l-2.5-2.5a.5.5 0 01.7-.7L8 11.3l4.5-4.5a.5.5 0 01.7.7z" />
                                    </svg>
                                  )}
                                </div>
                              </div>

                              {isOutbound && (
                                <div className={`w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 text-xs font-semibold shrink-0 mt-1 ${sameSender ? 'invisible' : ''}`}>
                                  {getInitials('You')}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            <div className="border-t border-gray-200 bg-white px-4 sm:px-6 py-4">
              {replyAiDowntime && (
                <div className="mb-3 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3">
                  <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-200">
                    <svg className="h-3 w-3 text-amber-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.132-1.5-4 0-.868 1.5-1 2.622-.232 3.478l.094.31z" />
                    </svg>
                  </div>
                  <p className="text-xs font-medium text-amber-800">Email generation service is temporarily blocked. Please write manually or try again shortly.</p>
                </div>
              )}

              {replyError && !replyAiDowntime && (
                <div className="mb-3 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-3">
                  <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-200">
                    <svg className="h-3 w-3 text-red-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                  <p className="text-xs font-medium text-red-800">{replyError}</p>
                </div>
              )}

              {googleConnected ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Quick Reply</label>
                    <button
                      type="button"
                      onClick={handleGenerateReplyDraft}
                      disabled={isGenerating || messages.length === 0}
                      className="text-xs font-medium text-primary-600 hover:text-primary-700 disabled:opacity-50 flex items-center gap-1"
                    >
                      {isGenerating ? (
                        <>
                          <div className="h-3 w-3 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
                          </svg>
                          Generate with AI
                        </>
                      )}
                    </button>
                  </div>

                  {lastInbound && (
                    <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                      <div className="flex items-start gap-2">
                        <div className="w-5 h-5 rounded-full bg-gray-400 flex items-center justify-center text-white text-[8px] font-semibold shrink-0 mt-0.5">
                          {getInitials(selectedLead.name)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] text-gray-400 font-medium">{selectedLead.name} wrote:</p>
                          <p className="text-xs text-gray-600 mt-0.5 line-clamp-2 whitespace-pre-wrap">{lastInbound.body}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  <input
                    type="text"
                    value={replySubject}
                    onChange={(e) => setReplySubject(e.target.value)}
                    placeholder="Subject..."
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-gray-50"
                  />
                  <textarea
                    value={replyBody}
                    onChange={(e) => setReplyBody(e.target.value)}
                    placeholder="Write your reply..."
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none bg-gray-50"
                  />
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={clearReply}
                      className="px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors"
                    >
                      Clear
                    </button>
                    <button
                      onClick={handleSendReply}
                      disabled={isSending || !replySubject.trim() || !replyBody.trim() || !googleConnected}
                      className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                    >
                      {isSending ? (
                        <>
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                          </svg>
                          Send Reply
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-400 text-center">Connect your Google account to send replies</p>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gray-50">
            <div className="text-center max-w-sm">
              <div className="w-20 h-20 mx-auto mb-5 rounded-full bg-white shadow-sm flex items-center justify-center">
                <svg className="w-10 h-10 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-700">Select a conversation</h3>
              <p className="text-sm text-gray-400 mt-1">Choose a lead from the sidebar to view your email thread and reply</p>
            </div>
          </div>
        )}
      </div>

      {showCompose && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm" onClick={(e) => e.target === e.currentTarget && setShowCompose(false)}>
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-base font-semibold text-gray-900">Compose Email</h2>
              <button onClick={() => setShowCompose(false)} className="flex h-7 w-7 items-center justify-center rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {composeSuccess && (
              <div className="mx-6 mt-4 flex items-start gap-3 rounded-xl border border-green-200 bg-green-50 p-3">
                <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-green-200">
                  <svg className="h-3 w-3 text-green-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                </div>
                <p className="text-xs font-medium text-green-800">Email sent successfully!</p>
              </div>
            )}

            {composeAiDowntime && (
              <div className="mx-6 mt-4 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3">
                <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-200">
                  <svg className="h-3 w-3 text-amber-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.132-1.5-4 0-.868 1.5-1 2.622-.232 3.478l.094.31z" />
                  </svg>
                </div>
                <p className="text-xs font-medium text-amber-800">Email generation service is temporarily blocked. Please write manually or try again shortly.</p>
              </div>
            )}

            {composeError && !composeAiDowntime && (
              <div className="mx-6 mt-4 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-3">
                <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-200">
                  <svg className="h-3 w-3 text-red-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
                <p className="text-xs font-medium text-red-800">{composeError}</p>
              </div>
            )}

            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-600 uppercase tracking-wider">To</label>
                <select
                  value={composeLead?._id || ''}
                  onChange={(e) => {
                    const lead = newLeads.find((l) => l._id === e.target.value);
                    setComposeLead(lead || null);
                  }}
                  disabled={newLeads.length === 0}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:opacity-60 disabled:bg-gray-50"
                >
                  {newLeads.length === 0 ? (
                    <option value="">No new leads available</option>
                  ) : (
                    <>
                      <option value="" disabled>Select a lead...</option>
                      {newLeads.map((lead) => (
                        <option key={lead._id} value={lead._id}>{lead.name} ({lead.email})</option>
                      ))}
                    </>
                  )}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-600 uppercase tracking-wider">Subject</label>
                <input
                  type="text"
                  value={composeSubject}
                  onChange={(e) => setComposeSubject(e.target.value)}
                  placeholder="Enter subject..."
                  disabled={composeAiDowntime && !composeSubject}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:opacity-60 disabled:bg-gray-50"
                />
              </div>

              <div>
                <div className="mb-1 flex items-center justify-between">
                  <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Body</label>
                  <button
                    type="button"
                    onClick={handleComposeGenerateDraft}
                    disabled={isComposeGenerating || !composeLead}
                    className="text-xs font-medium text-primary-600 hover:text-primary-700 disabled:opacity-50 flex items-center gap-1"
                  >
                    {isComposeGenerating ? (
                      <>
                        <div className="h-3 w-3 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
                        </svg>
                        Generate with AI
                      </>
                    )}
                  </button>
                </div>
                <textarea
                  value={composeBody}
                  onChange={(e) => setComposeBody(e.target.value)}
                  placeholder="Write your email body..."
                  rows={10}
                  disabled={composeAiDowntime && !composeBody}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none disabled:opacity-60 disabled:bg-gray-50 min-h-[180px]"
                />
              </div>
            </div>

            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
              <button type="button" onClick={() => { setShowCompose(false); clearCompose(); }} className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors">
                Cancel
              </button>
              <button
                onClick={handleComposeSend}
                disabled={isComposeSending || composeSuccess || !composeLead || !composeSubject.trim() || !composeBody.trim()}
                className="flex items-center gap-2 px-5 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              >
                {isComposeSending ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Sending...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                    </svg>
                    Send Email
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

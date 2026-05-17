import { useState, useEffect, useRef } from 'react';
import { generateDraft, sendEmail, getMessages } from '../../api/emailService';

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

interface EmailWorkspaceProps {
  leadId: string;
  leadName: string;
  leadEmail: string;
  onClose: () => void;
  onSent?: () => void;
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

const EmailWorkspace = ({ leadId, leadName, leadEmail, onClose, onSent }: EmailWorkspaceProps) => {
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aiDowntime, setAiDowntime] = useState(false);
  const [success, setSuccess] = useState(false);
  const [messages, setMessages] = useState<MessageData[]>([]);
  const [activeTab, setActiveTab] = useState<'compose' | 'history'>('compose');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const avatarColor = avatarColors[parseInt(leadId.slice(-2), 36) % avatarColors.length];

  const loadMessages = async () => {
    try {
      const response = await getMessages(leadId);
      if (response.success && response.data) {
        setMessages(response.data);
      }
    } catch (err) {
      console.error('Failed to load messages:', err);
    }
  };

  const handleGenerateDraft = async () => {
    setIsGenerating(true);
    setError(null);
    setAiDowntime(false);

    try {
      const response = await generateDraft(leadId);

      if (response.code === 'AI_DOWNTIME') {
        setAiDowntime(true);
        setError(response.message || 'Email generation service is temporarily blocked.');
      } else if (response.success && response.data) {
        setSubject(response.data.subject);
        setBody(response.data.body);
      } else {
        setError(response.message || 'Failed to generate draft');
      }
    } catch (err) {
      const error = err as { response?: { data?: { message?: string; code?: string } } };
      if (error.response?.data?.code === 'AI_DOWNTIME') {
        setAiDowntime(true);
        setError('Email generation service is temporarily blocked. Please write manually or try again shortly.');
      } else {
        setError('Failed to generate draft. Please try again.');
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSend = async () => {
    if (!subject.trim() || !body.trim()) {
      setError('Please fill in both subject and body');
      return;
    }

    setIsSending(true);
    setError(null);

    try {
      const response = await sendEmail({ leadId, toEmail: leadEmail, subject, body });

      if (response.success) {
        setSuccess(true);
        loadMessages();
        setTimeout(() => {
          onSent?.();
          onClose();
        }, 1500);
      } else {
        setError(response.message || 'Failed to send email');
      }
    } catch (err) {
      const error = err as { response?: { data?: { message?: string } } };
      setError(error.response?.data?.message || 'Failed to send email. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  useEffect(() => {
    handleGenerateDraft();
    loadMessages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leadId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (success) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
        <div className="w-full max-w-sm rounded-2xl border border-green-100 bg-white p-8 text-center shadow-xl">
          <div className="mb-4 mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          </div>
          <h3 className="text-lg font-bold text-gray-900">Email Sent!</h3>
          <p className="mt-1 text-sm text-gray-500">Your email to {leadName} has been sent successfully.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`w-9 h-9 rounded-full ${avatarColor} flex items-center justify-center text-white text-xs font-semibold shrink-0`}>
              {getInitials(leadName)}
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-semibold text-gray-900 truncate">{leadName}</h2>
              <p className="text-xs text-gray-500 truncate">{leadEmail}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex bg-gray-100 rounded-lg p-0.5">
              <button
                onClick={() => setActiveTab('compose')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  activeTab === 'compose' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Compose
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  activeTab === 'history' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                History ({messages.length})
              </button>
            </div>
            <button onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {aiDowntime && (
          <div className="mx-6 mt-4 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3">
            <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-200">
              <svg className="h-3 w-3 text-amber-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.132-1.5-4 0-.868 1.5-1 2.622-.232 3.478l.094.31z" />
              </svg>
            </div>
            <p className="text-xs font-medium text-amber-800">Email generation service is temporarily blocked. Please write manually or try again shortly.</p>
          </div>
        )}

        {error && !aiDowntime && (
          <div className="mx-6 mt-4 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-3">
            <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-200">
              <svg className="h-3 w-3 text-red-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <p className="text-xs font-medium text-red-800">{error}</p>
          </div>
        )}

        {activeTab === 'compose' ? (
          <>
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              <div>
                <label htmlFor="email-subject" className="mb-1 block text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Subject
                </label>
                <input
                  id="email-subject"
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Enter subject..."
                  disabled={aiDowntime && !subject}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:opacity-60 disabled:bg-gray-50"
                />
              </div>

              <div className="flex-1">
                <div className="mb-1 flex items-center justify-between">
                  <label htmlFor="email-body" className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Body
                  </label>
                  <button
                    type="button"
                    onClick={handleGenerateDraft}
                    disabled={isGenerating}
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
                        Regenerate with AI
                      </>
                    )}
                  </button>
                </div>
                <textarea
                  id="email-body"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Write your email body..."
                  rows={12}
                  disabled={aiDowntime && !body}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none disabled:opacity-60 disabled:bg-gray-50 min-h-[200px]"
                />
              </div>
            </div>

            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
              <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors">
                Cancel
              </button>
              <button
                onClick={handleSend}
                disabled={isSending || !subject.trim() || !body.trim()}
                className="flex items-center gap-2 px-5 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
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
                    Send Email
                  </>
                )}
              </button>
            </div>
          </>
        ) : (
          <div className="flex-1 overflow-y-auto px-6 py-4">
            {messages.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-gray-100 flex items-center justify-center">
                  <svg className="w-6 h-6 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <p className="text-sm text-gray-500">No emails yet</p>
                <p className="text-xs text-gray-400 mt-0.5">Send an email to start the conversation</p>
              </div>
            ) : (
              <div className="space-y-1">
                {messages.map((msg, idx) => {
                  const isOutbound = msg.direction === 'outbound';
                  const sameSender = idx > 0 && messages[idx - 1].direction === msg.direction;

                  return (
                    <div key={msg._id} className={`flex gap-2.5 py-1 ${isOutbound ? 'justify-end' : 'justify-start'}`}>
                      {!isOutbound && (
                        <div className={`w-7 h-7 rounded-full ${avatarColor} flex items-center justify-center text-white text-[10px] font-semibold shrink-0 mt-1 ${sameSender ? 'invisible' : ''}`}>
                          {getInitials(leadName)}
                        </div>
                      )}

                      <div className={`max-w-[85%] ${isOutbound ? 'items-end' : 'items-start'} flex flex-col`}>
                        <div className={`rounded-2xl px-3.5 py-2 text-sm leading-relaxed whitespace-pre-wrap break-words ${
                          isOutbound
                            ? 'bg-primary-600 text-white rounded-br-md'
                            : 'bg-gray-100 text-gray-800 rounded-bl-md'
                        }`}>
                          <p className="text-[11px] font-medium opacity-70 mb-1">{msg.subject}</p>
                          {msg.body}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 px-1">
                          <span className="text-[10px] text-gray-400">{timeAgo(msg.createdAt)}</span>
                          {isOutbound && msg.aiClassification && msg.aiClassification !== 'Pending' && (
                            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                              msg.aiClassification === 'Qualified' ? 'bg-green-100 text-green-700' :
                              msg.aiClassification === 'Lost' ? 'bg-red-100 text-red-700' :
                              'bg-amber-100 text-amber-700'
                            }`}>
                              {msg.aiClassification}
                            </span>
                          )}
                        </div>
                      </div>

                      {isOutbound && (
                        <div className={`w-7 h-7 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 text-[10px] font-semibold shrink-0 mt-1 ${sameSender ? 'invisible' : ''}`}>
                          ME
                        </div>
                      )}
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default EmailWorkspace;

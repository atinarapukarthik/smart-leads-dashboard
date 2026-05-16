import { useState, useEffect } from 'react';
import { generateDraft, sendEmail } from '../../api/emailService';

interface EmailWorkspaceProps {
  leadId: string;
  leadName: string;
  leadEmail: string;
  onClose: () => void;
  onSent?: () => void;
}

const EmailWorkspace = ({ leadId, leadName, leadEmail, onClose, onSent }: EmailWorkspaceProps) => {
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aiDowntime, setAiDowntime] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    handleGenerateDraft();
  }, [leadId]);

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
      const response = await sendEmail({ leadId, subject, body });

      if (response.success) {
        setSuccess(true);
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

  if (success) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
        <div className="w-full max-w-md rounded-2xl border border-green-200 bg-white p-8 text-center shadow-xl">
          <div className="mb-4 flex h-16 w-16 mx-auto items-center justify-center rounded-full bg-green-100">
            <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-gray-900">Email Sent!</h3>
          <p className="mt-2 text-gray-500">Your email to {leadName} has been sent successfully.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-2xl animate-slide-up rounded-2xl border border-gray-200 bg-white shadow-2xl">
        <div className="border-b border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Compose Email</h2>
              <p className="mt-0.5 text-sm text-gray-500">To: {leadName} ({leadEmail})</p>
            </div>
            <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {aiDowntime && (
          <div className="mx-6 mt-4 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-200">
              <svg className="h-3.5 w-3.5 text-amber-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.132-1.5-4 0-.868 1.5-1 2.622-.232 3.478l.094.31z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-amber-800">Email generation service is temporarily blocked. Please write manually or try again shortly.</p>
            </div>
          </div>
        )}

        {error && !aiDowntime && (
          <div className="mx-6 mt-4 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-red-200">
              <svg className="h-3.5 w-3.5 text-red-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <p className="text-sm font-medium text-red-800">{error}</p>
          </div>
        )}

        <div className="p-6 space-y-4">
          <div>
            <label htmlFor="email-subject" className="mb-1.5 block text-sm font-semibold text-gray-700">
              Subject
            </label>
            <input
              id="email-subject"
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Enter subject..."
              disabled={aiDowntime && !subject}
              className="input-field"
            />
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label htmlFor="email-body" className="block text-sm font-semibold text-gray-700">
                Body
              </label>
              <button
                type="button"
                onClick={handleGenerateDraft}
                disabled={isGenerating}
                className="text-xs font-medium text-primary-600 hover:text-primary-700 disabled:opacity-50"
              >
                {isGenerating ? 'Generating...' : 'Regenerate with AI'}
              </button>
            </div>
            <textarea
              id="email-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write your email body..."
              rows={12}
              disabled={aiDowntime && !body}
              className="input-field min-h-[250px] resize-none"
            />
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-gray-200 p-6">
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary"
          >
            Cancel
          </button>
          <button
            onClick={handleSend}
            disabled={isSending || !subject.trim() || !body.trim() || (aiDowntime && !body)}
            className="btn-primary"
          >
            {isSending ? (
              <span className="flex items-center gap-2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Sending...
              </span>
            ) : (
              'Send Email'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EmailWorkspace;
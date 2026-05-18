import { useState, useEffect, useCallback } from 'react';
import { getLeads, createLead, deleteLead, getContactedLeads } from '../api/leadService';
import { getIntegrationStatus, initiateGoogleOAuth } from '../api/emailService';
import { useAuth } from '../context/AuthContext';
import useDebounce from '../hooks/useDebounce';
import Loader from '../components/ui/Loader';
import EmptyState from '../components/ui/EmptyState';
import ErrorFallback from '../components/ui/ErrorFallback';
import LeadTable from '../components/leads/LeadTable';
import KpiCards from '../components/leads/KpiCards';
import CreateLeadModal from '../components/leads/CreateLeadModal';
import EmailWorkspace from '../components/leads/EmailWorkspace';
import LeadDetailPanel from '../components/leads/LeadDetailPanel';
import DashboardNav from '../components/layout/DashboardNav';
import AnalyticsPage from './AnalyticsPage';
import EmailPage from '../components/email/EmailPage';
import type { Lead, PaginatedResponse } from '../types';

const SettingsTab = () => {
  const { user } = useAuth();
  return (
    <div className="mx-auto max-w-2xl py-8">
      <h2 className="mb-6 text-xl font-bold text-gray-900">Account Settings</h2>
      <div className="card divide-y divide-gray-100">
        <div className="flex items-center justify-between px-6 py-4">
          <div>
            <p className="text-sm font-medium text-gray-900">Name</p>
            <p className="text-sm text-gray-500">{user?.name}</p>
          </div>
        </div>
        <div className="flex items-center justify-between px-6 py-4">
          <div>
            <p className="text-sm font-medium text-gray-900">Email</p>
            <p className="text-sm text-gray-500">{user?.email}</p>
          </div>
        </div>
        <div className="flex items-center justify-between px-6 py-4">
          <div>
            <p className="text-sm font-medium text-gray-900">Role</p>
            <span className="mt-0.5 inline-block rounded-full bg-primary-50 px-2.5 py-0.5 text-xs font-medium text-primary-700">
              {user?.role}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

const Dashboard = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'Admin';

  const [activeTab, setActiveTab] = useState('leads');
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [source, setSource] = useState('');
  const [sort, setSort] = useState('Latest');
  const [pagination, setPagination] = useState<PaginatedResponse<Lead>['pagination'] | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedLeadForEmail, setSelectedLeadForEmail] = useState<Lead | null>(null);
  const [selectedLeadDetail, setSelectedLeadDetail] = useState<Lead | null>(null);
  const [leadDetailTab, setLeadDetailTab] = useState<'overview' | 'email'>('overview');
  const [googleConnected, setGoogleConnected] = useState(false);
  const [contactedLeads, setContactedLeads] = useState<Lead[]>([]);

  const fetchContactedLeads = useCallback(async () => {
    try {
      const res = await getContactedLeads();
      if (res.data.success) {
        setContactedLeads(res.data.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch contacted leads:', err);
    }
  }, []);

  useEffect(() => {
    fetchContactedLeads();
  }, [fetchContactedLeads]);

  const fetchGoogleStatus = useCallback(async () => {
    console.log('[Dashboard] Fetching Google status...');
    try {
      const res = await getIntegrationStatus();
      console.log('[Dashboard] Google status response:', res);
      setGoogleConnected(res.connected ?? false);
    } catch (err) {
      console.error('[Dashboard] Google status error:', err);
      setGoogleConnected(false);
    }
  }, []);

  useEffect(() => {
    fetchGoogleStatus();
  }, [fetchGoogleStatus]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('success') === 'google_connected') {
      console.log('[Dashboard] Google OAuth success detected, refetching status...');
      fetchGoogleStatus();
      // Clean URL
      const cleanUrl = params.get('token') 
        ? '/dashboard?tab=email' 
        : '/dashboard?tab=email';
      window.history.replaceState({}, '', cleanUrl);
    }
  }, [fetchGoogleStatus]);

  const debouncedSearch = useDebounce(search, 500);

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getLeads({
        page,
        limit: 10,
        search: debouncedSearch || undefined,
        status: status || undefined,
        source: source || undefined,
        sort,
      });
      setLeads(res.data.data);
      setPagination(res.data.pagination);
    } catch {
      setError('Failed to load leads. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, status, source, sort]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this lead?')) {
      return;
    }
    try {
      await deleteLead(id);
      setLeads((prev) => prev.filter((lead) => lead._id !== id));
    } catch {
      setError('Failed to delete lead. Please try again.');
    }
  };

  const handleCreate = async (data: {
    name: string;
    email: string;
    status: 'New' | 'Contacted' | 'Qualified' | 'Lost';
    source: 'Website' | 'Instagram' | 'Referral';
  }) => {
    try {
      const res = await createLead(data);
      setLeads((prev) => [res.data.data, ...prev]);
      setShowModal(false);
    } catch {
      setError('Failed to create lead. Please try again.');
    }
  };

  const exportCSV = () => {
    const headers = ['Name', 'Email', 'Status', 'Source', 'Date'];
    const rows = leads.map((lead) => [
      lead.name,
      lead.email,
      lead.status,
      lead.source,
      new Date(lead.createdAt).toLocaleDateString(),
    ]);
    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell) => `"${cell}"`).join(','))
      .join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `leads-export-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const hasData = leads.length > 0;

  if (loading && !hasData) {
    return <Loader />;
  }

  if (error && !hasData) {
    return <ErrorFallback error={error} onRetry={fetchLeads} />;
  }

  if (activeTab === 'email' && !googleConnected) {
    return (
      <>
        <DashboardNav activeTab={activeTab} onTabChange={setActiveTab} />
        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-md text-center py-12">
            <div className="mb-6 flex h-20 w-20 mx-auto items-center justify-center rounded-full bg-primary-100">
              <svg className="h-10 w-10 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900">Connect Google Account</h2>
            <p className="mt-2 text-gray-500">Connect your Google account to send emails and use AI-powered features.</p>
            <button
              type="button"
              onClick={async () => {
                try {
                  const res = await initiateGoogleOAuth();
                  console.log('Google OAuth response:', res);
                  if (res.success && res.mode === 'live' && res.authUrl) {
                    window.location.href = res.authUrl;
                  } else if (res.mode === 'offline') {
                    alert('Google OAuth credentials not configured in backend. Running in offline mode.');
                  } else {
                    alert(res.message || 'Failed to initiate Google OAuth');
                  }
                } catch (err) {
                  console.error('Google OAuth error:', err);
                  const error = err as { response?: { data?: { message?: string } } };
                  alert(error.response?.data?.message || 'Failed to initiate Google OAuth. Please check console.');
                }
              }}
              className="mt-6 btn-primary"
            >
              Connect Google Account
            </button>
          </div>
        </main>
      </>
    );
  }

  if (activeTab === 'email') {
    return (
      <>
        <DashboardNav activeTab={activeTab} onTabChange={setActiveTab} />
        {selectedLeadForEmail ? (
          <EmailWorkspace
            leadId={selectedLeadForEmail._id}
            leadName={selectedLeadForEmail.name}
            leadEmail={selectedLeadForEmail.email}
            onClose={() => {
              setSelectedLeadForEmail(null);
              fetchContactedLeads();
            }}
          />
        ) : (
          <EmailPage
            contactedLeads={contactedLeads}
            googleConnected={googleConnected}
            onSyncComplete={fetchContactedLeads}
          />
        )}
      </>
    );
  }

  if (activeTab === 'analytics') {
    return (
      <>
        <DashboardNav activeTab={activeTab} onTabChange={setActiveTab} />
        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <AnalyticsPage />
        </main>
      </>
    );
  }

  if (activeTab === 'settings') {
    return (
      <>
        <DashboardNav activeTab={activeTab} onTabChange={setActiveTab} />
        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <SettingsTab />
        </main>
      </>
    );
  }

  return (
    <>
      <DashboardNav activeTab={activeTab} onTabChange={setActiveTab} />
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Leads Dashboard</h1>
          <p className="mt-0.5 text-sm text-gray-500">
            {pagination ? `Showing ${leads.length} of ${pagination.totalRecords} leads` : 'Track and manage your leads'}
          </p>
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={exportCSV}
            disabled={!hasData}
            className="btn-secondary"
          >
            <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            Export CSV
          </button>
          {isAdmin && (
            <button
              type="button"
              onClick={() => setShowModal(true)}
              className="btn-primary"
            >
              <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m6-6H6" />
              </svg>
              Add Lead
            </button>
          )}
        </div>
      </div>

      {hasData && (
        <div className="mb-6">
          <KpiCards leads={leads} />
        </div>
      )}

      <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by name or email..."
            className="input-field pl-9"
          />
        </div>
        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          className="select-field"
        >
          <option value="">All Statuses</option>
          <option value="New">New</option>
          <option value="Contacted">Contacted</option>
          <option value="Qualified">Qualified</option>
          <option value="Lost">Lost</option>
        </select>
        <select
          value={source}
          onChange={(e) => { setSource(e.target.value); setPage(1); }}
          className="select-field"
        >
          <option value="">All Sources</option>
          <option value="Website">Website</option>
          <option value="Instagram">Instagram</option>
          <option value="Referral">Referral</option>
        </select>
        <select
          value={sort}
          onChange={(e) => { setSort(e.target.value); setPage(1); }}
          className="select-field"
        >
          <option value="Latest">Latest First</option>
          <option value="Oldest">Oldest First</option>
        </select>
      </div>

      {error && hasData && (
        <div className="mb-4">
          <ErrorFallback error={error} onRetry={fetchLeads} />
        </div>
      )}

      {!loading && !hasData && !error && (
        <EmptyState
          title="No Leads Found"
          message={search || status || source ? 'Adjust your filters to see more results.' : 'Start by adding your first lead.'}
          action={isAdmin ? { label: 'Add Your First Lead', onClick: () => setShowModal(true) } : undefined}
        />
      )}

      {hasData && (
        <>
          <div className="card">
            <LeadTable
              leads={leads}
              onDelete={handleDelete}
              onEmailClick={(lead) => {
                setSelectedLeadForEmail(lead);
                setActiveTab('email');
              }}
              onRowClick={(lead) => {
                setSelectedLeadDetail(lead);
                setLeadDetailTab('overview');
              }}
              selectedLeadId={selectedLeadDetail?._id}
            />
          </div>

          {selectedLeadDetail && (
            <>
              <div 
                className="fixed inset-0 bg-black/20 z-30"
                onClick={() => setSelectedLeadDetail(null)}
              />
              <LeadDetailPanel
                lead={selectedLeadDetail}
                onClose={() => setSelectedLeadDetail(null)}
                onSendEmail={() => {
                  setSelectedLeadForEmail(selectedLeadDetail);
                  setActiveTab('email');
                }}
                activeTab={leadDetailTab}
                onTabChange={setLeadDetailTab}
              />
            </>
          )}

          {pagination && pagination.totalPages > 1 && (
            <div className="mt-5 flex flex-col items-center justify-between gap-4 sm:flex-row">
              <p className="text-sm text-gray-500">
                Showing{' '}
                <span className="font-medium text-gray-700">{(pagination.currentPage - 1) * pagination.limit + 1}</span>
                {' '}to{' '}
                <span className="font-medium text-gray-700">
                  {Math.min(pagination.currentPage * pagination.limit, pagination.totalRecords)}
                </span>
                {' '}of{' '}
                <span className="font-medium text-gray-700">{pagination.totalRecords}</span>
                {' '}results
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={pagination.currentPage === 1}
                  className="btn-secondary px-3 py-1.5"
                >
                  <svg className="mr-1 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                  </svg>
                  Previous
                </button>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                  disabled={pagination.currentPage === pagination.totalPages}
                  className="btn-secondary px-3 py-1.5"
                >
                  Next
                  <svg className="ml-1 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                  </svg>
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {showModal && (
        <CreateLeadModal onSubmit={handleCreate} onClose={() => setShowModal(false)} />
      )}
    </main>
    </>
  );
};

export default Dashboard;

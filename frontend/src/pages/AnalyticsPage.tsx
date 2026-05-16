import { useState, useEffect } from 'react';
import { getLeads } from '../api/leadService';
import apiClient from '../api/client';
import Loader from '../components/ui/Loader';
import ErrorFallback from '../components/ui/ErrorFallback';
import { useAuth } from '../context/AuthContext';
import type { Lead } from '../types';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  AreaChart, Area,
} from 'recharts';

interface SalesPerformanceData {
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
}

interface AnalyticsData {
  salesPerformance: SalesPerformanceData[];
  overview: Record<string, unknown>;
}

const COLORS = {
  New: '#3b82f6',
  Contacted: '#f59e0b',
  Qualified: '#10b981',
  Lost: '#ef4444',
};

const SOURCE_COLORS: Record<string, string> = {
  Website: '#8b5cf6',
  Instagram: '#ec4899',
  Referral: '#14b8a6',
};

const STATUS_ORDER = ['New', 'Contacted', 'Qualified', 'Lost'] as const;

function groupBy<T>(items: T[], keyFn: (item: T) => string): Record<string, T[]> {
  const map: Record<string, T[]> = {};
  for (const item of items) {
    const key = keyFn(item);
    if (!map[key]) map[key] = [];
    map[key].push(item);
  }
  return map;
}

function formatNumber(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : n.toString();
}

const AnalyticsPage = () => {
  const { user } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [salesPerformance, setSalesPerformance] = useState<SalesPerformanceData[]>([]);
  const [loadingPerformance, setLoadingPerformance] = useState(false);

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await getLeads({ limit: 1000, sort: 'Latest' });
        setLeads(res.data.data);

        if (user?.role === 'Admin') {
          setLoadingPerformance(true);
          try {
            const perfRes = await apiClient.get<{ success: boolean; data: AnalyticsData }>('/analytics/sales-performance');
            if (perfRes.data.success) {
              setSalesPerformance(perfRes.data.data.salesPerformance);
            }
          } catch {
            console.error('Failed to load sales performance data');
          } finally {
            setLoadingPerformance(false);
          }
        }
      } catch {
        setError('Failed to load analytics data.');
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, [user?.role]);

  if (loading) {
    return <div className="py-20"><Loader /></div>;
  }

  if (error) {
    return <div className="py-20"><ErrorFallback error={error} onRetry={() => window.location.reload()} /></div>;
  }

  const now = new Date();
  const thisMonth = now.getMonth();
  const thisYear = now.getFullYear();
  const leadsThisMonth = leads.filter((l) => {
    const d = new Date(l.createdAt);
    return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
  });
  const daysElapsed = Math.max(1, now.getDate());

  const totalLeads = leads.length;
  const qualifiedLeads = leads.filter((l) => l.status === 'Qualified').length;
  const conversionRate = totalLeads ? ((qualifiedLeads / totalLeads) * 100).toFixed(1) : '0.0';
  const avgPerDay = (leadsThisMonth.length / daysElapsed).toFixed(1);

  const statusCounts = leads.reduce(
    (acc, l) => {
      acc[l.status] = (acc[l.status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  const statusData = STATUS_ORDER.map((s) => ({
    name: s,
    value: statusCounts[s] || 0,
  }));

  const sourceData = Object.entries(
    leads.reduce(
      (acc, l) => {
        acc[l.source] = (acc[l.source] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    ),
  )
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  const last30Days: { date: string; count: number }[] = [];
  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() - 29);
  for (let i = 0; i < 30; i++) {
    const d = new Date(cutoff);
    d.setDate(d.getDate() + i);
    const key = d.toISOString().slice(0, 10);
    last30Days.push({ date: key, count: 0 });
  }
  const dayBuckets = groupBy(leads, (l) => l.createdAt.slice(0, 10));
  for (const bucket of last30Days) {
    bucket.count = dayBuckets[bucket.date]?.length || 0;
  }
  const trendData = last30Days;

  const recentLeads = [...leads].slice(0, 5);

  const isAdmin = user?.role === 'Admin';

  const KPI_CARDS = [
    {
      label: 'Total Leads',
      value: formatNumber(totalLeads),
      sub: `All time`,
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
        </svg>
      ),
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      label: 'Conversion Rate',
      value: `${conversionRate}%`,
      sub: `${qualifiedLeads} qualified`,
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
        </svg>
      ),
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
    },
    {
      label: 'This Month',
      value: formatNumber(leadsThisMonth.length),
      sub: `${now.toLocaleString('default', { month: 'long' })} ${thisYear}`,
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
        </svg>
      ),
      color: 'text-violet-600',
      bg: 'bg-violet-50',
    },
    {
      label: 'Avg / Day',
      value: avgPerDay,
      sub: `This month (${daysElapsed}d)`,
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 4.5h14.25M3 9h9.75M3 13.5h5.25m5.25-.75H17.25m-3 0h.75m-9 0h.75m9 3h.75M3 18h5.25m5.25 0h.75M3 22.5h14.25" />
        </svg>
      ),
      color: 'text-amber-600',
      bg: 'bg-amber-50',
    },
  ];

  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: { value: number; payload?: { date?: string; name?: string } }[]; label?: string }) => {
    if (active && payload?.length) {
      return (
        <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-lg">
          <p className="text-sm font-medium text-gray-900">{label || payload[0]?.payload?.name}</p>
          <p className="text-sm text-gray-500">{payload[0].value} leads</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
        <p className="mt-1 text-sm text-gray-500">
          Overview of your lead generation performance.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {KPI_CARDS.map((kpi) => (
          <div key={kpi.label} className="card p-5">
            <div className="flex items-center justify-between">
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${kpi.bg}`}>
                <span className={kpi.color}>{kpi.icon}</span>
              </div>
            </div>
            <p className="mt-4 text-2xl font-bold text-gray-900">{kpi.value}</p>
            <p className="text-sm font-medium text-gray-900">{kpi.label}</p>
            <p className="text-xs text-gray-500">{kpi.sub}</p>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">

        {/* Status Donut */}
        <div className="card p-5 lg:col-span-2">
          <h3 className="mb-1 text-base font-semibold text-gray-900">Lead Status</h3>
          <p className="mb-4 text-xs text-gray-500">Distribution by current stage</p>
          <div className="flex h-64 items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {statusData.map((entry) => (
                    <Cell key={entry.name} fill={COLORS[entry.name as keyof typeof COLORS] || '#9ca3af'} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 flex flex-wrap justify-center gap-4">
            {statusData.map((s) => (
              <div key={s.name} className="flex items-center gap-1.5">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: COLORS[s.name as keyof typeof COLORS] || '#9ca3af' }}
                />
                <span className="text-xs text-gray-600">
                  {s.name} <span className="font-medium text-gray-900">{s.value}</span>
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Source Bar */}
        <div className="card p-5 lg:col-span-3">
          <h3 className="mb-1 text-base font-semibold text-gray-900">Lead Sources</h3>
          <p className="mb-4 text-xs text-gray-500">Where your leads come from</p>
          <div className="flex h-64 items-end">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sourceData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={48}>
                  {sourceData.map((entry) => (
                    <Cell key={entry.name} fill={SOURCE_COLORS[entry.name] || '#9ca3af'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Trend Area Chart */}
      <div className="card p-5">
        <h3 className="mb-1 text-base font-semibold text-gray-900">Daily Leads (Last 30 Days)</h3>
        <p className="mb-4 text-xs text-gray-500">New leads created per day</p>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trendData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
              <defs>
                <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6366f1" stopOpacity={0.2} />
                  <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: '#6b7280' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v: string) => {
                  const d = new Date(v);
                  return `${d.getMonth() + 1}/${d.getDate()}`;
                }}
              />
              <YAxis tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="count" stroke="#6366f1" strokeWidth={2} fill="url(#trendGradient)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Leads */}
      {recentLeads.length > 0 && (
        <div className="card">
          <div className="border-b border-gray-100 px-5 py-4">
            <h3 className="text-base font-semibold text-gray-900">Recent Leads</h3>
          </div>
          <div className="divide-y divide-gray-50">
            {recentLeads.map((lead) => (
              <div key={lead._id} className="flex items-center justify-between px-5 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-gray-900">{lead.name}</p>
                  <p className="truncate text-xs text-gray-500">{lead.email}</p>
                </div>
                <div className="ml-4 flex items-center gap-3">
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium
                      ${lead.status === 'New' ? 'bg-blue-50 text-blue-700' : ''}
                      ${lead.status === 'Contacted' ? 'bg-amber-50 text-amber-700' : ''}
                      ${lead.status === 'Qualified' ? 'bg-emerald-50 text-emerald-700' : ''}
                      ${lead.status === 'Lost' ? 'bg-red-50 text-red-700' : ''}
                    `}
                  >
                    {lead.status}
                  </span>
                  <span className="hidden text-xs text-gray-400 sm:block">
                    {new Date(lead.createdAt).toLocaleDateString()}
                  </span>
                  <span
                    className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
                    style={{
                      backgroundColor: `${SOURCE_COLORS[lead.source]}15`,
                      color: SOURCE_COLORS[lead.source],
                    }}
                  >
                    {lead.source}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sales Performance Table - Admin Only */}
      {isAdmin && (
        <div className="card">
          <div className="border-b border-gray-100 px-5 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-gray-900">Sales Performance</h3>
                <p className="text-xs text-gray-500">Team performance metrics across all users</p>
              </div>
              {loadingPerformance && (
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <div className="h-3 w-3 animate-spin rounded-full border border-gray-300 border-t-primary-600" />
                  Loading...
                </div>
              )}
            </div>
          </div>

          {salesPerformance.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">User</th>
                    <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Emails Sent</th>
                    <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Replies</th>
                    <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Qualified</th>
                    <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Lost</th>
                    <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Response Rate</th>
                    <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Conversion</th>
                    <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Last Active</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {salesPerformance.map((perf) => (
                    <tr key={perf.userId} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3">
                        <div className="flex items-center">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-100 text-primary-700 text-sm font-semibold">
                            {perf.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="ml-3">
                            <p className="text-sm font-medium text-gray-900">{perf.name}</p>
                            <p className="text-xs text-gray-500">{perf.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-right text-sm text-gray-900">{perf.emailsSent}</td>
                      <td className="px-5 py-3 text-right text-sm text-gray-900">{perf.repliesReceived}</td>
                      <td className="px-5 py-3 text-right text-sm font-medium text-emerald-600">{perf.leadsQualified}</td>
                      <td className="px-5 py-3 text-right text-sm font-medium text-red-600">{perf.leadsLost}</td>
                      <td className="px-5 py-3 text-right">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                          parseFloat(perf.responseRate) > 20 ? 'bg-emerald-50 text-emerald-700' :
                          parseFloat(perf.responseRate) > 10 ? 'bg-amber-50 text-amber-700' :
                          'bg-red-50 text-red-700'
                        }`}>
                          {perf.responseRate}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                          parseFloat(perf.conversionRate) > 30 ? 'bg-emerald-50 text-emerald-700' :
                          parseFloat(perf.conversionRate) > 15 ? 'bg-amber-50 text-amber-700' :
                          'bg-red-50 text-red-700'
                        }`}>
                          {perf.conversionRate}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right text-sm text-gray-500">
                        {perf.lastActive ? new Date(perf.lastActive).toLocaleDateString() : 'Never'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
                <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                </svg>
              </div>
              <p className="mt-3 text-sm font-medium text-gray-900">No performance data yet</p>
              <p className="text-xs text-gray-500">Sales metrics will appear once users start sending emails</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AnalyticsPage;

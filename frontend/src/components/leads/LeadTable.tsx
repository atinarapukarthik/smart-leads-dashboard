import { useAuth } from '../../context/AuthContext';
import type { Lead } from '../../types';

interface LeadTableProps {
  leads: Lead[];
  onDelete: (id: string) => void;
  onEmailClick?: (lead: Lead) => void;
  onRowClick?: (lead: Lead) => void;
  selectedLeadId?: string;
}

const statusColors: Record<string, string> = {
  New: 'bg-blue-100 text-blue-700 ring-blue-600/20',
  Contacted: 'bg-amber-100 text-amber-700 ring-amber-600/20',
  Qualified: 'bg-emerald-100 text-emerald-700 ring-emerald-600/20',
  Lost: 'bg-red-100 text-red-700 ring-red-600/20',
};

const LeadTable = ({ leads, onDelete, onEmailClick, onRowClick, selectedLeadId }: LeadTableProps) => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'Admin';

  if (leads.length === 0) {
    return null;
  }

  return (
    <>
      {/* Mobile card view */}
      <div className="divide-y divide-gray-100 sm:hidden">
        {leads.map((lead) => (
          <div key={lead._id} className="p-4 transition-colors hover:bg-gray-50">
            <div className="mb-2 flex items-start justify-between">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-gray-900">{lead.name}</p>
                <p className="truncate text-sm text-gray-500">{lead.email}</p>
              </div>
              <span
                className={`ml-2 inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${statusColors[lead.status] ?? 'bg-gray-100 text-gray-700 ring-gray-500/20'}`}
              >
                {lead.status}
              </span>
            </div>
            <div className="mt-3 flex items-center justify-between gap-2">
              <div className="flex items-center gap-3 text-xs text-gray-500">
                <span className="inline-flex items-center gap-1">
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                  </svg>
                  {lead.source}
                </span>
                <span className="inline-flex items-center gap-1">
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                  </svg>
                  {new Date(lead.createdAt).toLocaleDateString()}
                </span>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => onEmailClick?.(lead)}
                  className="inline-flex items-center gap-1 rounded-lg border border-primary-200 bg-primary-50 px-2.5 py-1.5 text-xs font-medium text-primary-700 transition-colors hover:bg-primary-100"
                >
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                  </svg>
                  Email
                </button>
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => onDelete(lead._id)}
                    className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50"
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop table view */}
      <div className="hidden sm:block">
        <table className="min-w-full divide-y divide-gray-200">
          <thead>
            <tr>
              <th className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Name</th>
              <th className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Email</th>
              <th className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Status</th>
              <th className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Source</th>
              <th className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Created</th>
              <th className="px-4 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">Email</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {leads.map((lead) => (
              <tr 
                key={lead._id} 
                onClick={() => onRowClick?.(lead)}
                className={`transition-colors hover:bg-gray-50 cursor-pointer ${selectedLeadId === lead._id ? 'bg-primary-50' : ''}`}
              >
                <td className="whitespace-nowrap px-4 py-3.5 text-sm font-medium text-gray-900">
                  {lead.name}
                </td>
                <td className="whitespace-nowrap px-4 py-3.5 text-sm text-gray-500">
                  {lead.email}
                </td>
                <td className="whitespace-nowrap px-4 py-3.5 text-sm">
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${statusColors[lead.status] ?? 'bg-gray-100 text-gray-700 ring-gray-500/20'}`}
                  >
                    {lead.status}
                  </span>
                </td>
                <td className="whitespace-nowrap px-4 py-3.5 text-sm text-gray-500">
                  {lead.source}
                </td>
                <td className="whitespace-nowrap px-4 py-3.5 text-sm text-gray-500">
                  {new Date(lead.createdAt).toLocaleDateString()}
                </td>
                <td className="whitespace-nowrap px-4 py-3.5 text-right text-sm">
                  <button
                    type="button"
                    onClick={() => onEmailClick?.(lead)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-primary-200 bg-primary-50 px-3 py-1.5 text-xs font-medium text-primary-700 transition-colors hover:bg-primary-100"
                  >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                    </svg>
                    Email
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
};

export default LeadTable;

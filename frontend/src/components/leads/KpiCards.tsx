import type { Lead } from '../../types';

interface KpiCardsProps {
  leads: Lead[];
}

const kpiConfig = [
  {
    key: 'total',
    label: 'Total Leads',
    color: 'bg-primary-500',
    bgLight: 'bg-primary-50',
    textColor: 'text-primary-600',
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
      </svg>
    ),
    filter: (_leads: Lead[]) => _leads.length,
  },
  {
    key: 'new',
    label: 'New',
    color: 'bg-blue-500',
    bgLight: 'bg-blue-50',
    textColor: 'text-blue-600',
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m6-6H6" />
      </svg>
    ),
    filter: (_leads: Lead[]) => _leads.filter((l) => l.status === 'New').length,
  },
  {
    key: 'qualified',
    label: 'Qualified',
    color: 'bg-green-500',
    bgLight: 'bg-green-50',
    textColor: 'text-green-600',
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    filter: (_leads: Lead[]) => _leads.filter((l) => l.status === 'Qualified').length,
  },
  {
    key: 'lost',
    label: 'Lost',
    color: 'bg-red-500',
    bgLight: 'bg-red-50',
    textColor: 'text-red-600',
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
      </svg>
    ),
    filter: (_leads: Lead[]) => _leads.filter((l) => l.status === 'Lost').length,
  },
];

const KpiCards = ({ leads }: KpiCardsProps) => {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {kpiConfig.map((kpi) => {
        const value = kpi.filter(leads);
        return (
          <div
            key={kpi.key}
            className="card flex items-center gap-4 p-4 transition-all duration-200 hover:shadow-md"
          >
            <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${kpi.bgLight} ${kpi.textColor}`}>
              {kpi.icon}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-gray-500">{kpi.label}</p>
              <p className="text-2xl font-bold text-gray-900">{value}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default KpiCards;

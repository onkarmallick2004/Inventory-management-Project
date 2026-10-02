// Technician home (mobile-first): today's and upcoming jobs as big tappable cards.
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { qs } from '../../api/client';
import useApi from '../../hooks/useApi';
import { AsyncContent, Badge, EmptyState, PageHeader } from '../../components/ui';
import { formatDate, relativeDays } from '../../utils/format';

const TABS = [['active', 'To do'], ['CLOSED', 'Completed']];

export default function MyJobs() {
  const [tab, setTab] = useState('active');
  // "To do" = OPEN + IN_PROGRESS. The API filters one status at a time, so load both and merge.
  const open = useApi(tab === 'active' ? `/jobs?${qs({ status: 'OPEN', limit: 100, sort: 'scheduledDate:asc' })}` : null);
  const progress = useApi(tab === 'active' ? `/jobs?${qs({ status: 'IN_PROGRESS', limit: 100, sort: 'scheduledDate:asc' })}` : null);
  const closed = useApi(tab === 'CLOSED' ? `/jobs?${qs({ status: 'CLOSED', limit: 30, sort: 'closedDate:desc' })}` : null);

  const jobs = tab === 'active' ? [...(progress.data?.data || []), ...(open.data?.data || [])] : closed.data?.data || [];
  const loading = tab === 'active' ? open.loading || progress.loading : closed.loading;
  const error = tab === 'active' ? open.error || progress.error : closed.error;

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="My jobs" />
      <div className="mb-4 grid grid-cols-2 rounded-lg bg-white p-1 shadow-sm">
        {TABS.map(([value, text]) => (
          <button key={value} onClick={() => setTab(value)}
            className={`rounded-md py-2 text-sm font-semibold ${tab === value ? 'bg-steel-800 text-white' : 'text-slate-600'}`}>
            {text}
          </button>
        ))}
      </div>
      <AsyncContent loading={loading} error={error}>
        {jobs.length === 0 ? (
          <EmptyState title={tab === 'active' ? 'No jobs assigned to you right now' : 'No completed jobs yet'} />
        ) : (
          <ul className="space-y-3">
            {jobs.map((j) => (
              <li key={j.id}>
                <Link to={`/tech/jobs/${j.id}`} className="block rounded-xl border border-slate-200 bg-white p-4 shadow-sm active:bg-brand-50">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-slate-900">{j.machine.customer.companyName}</p>
                      <p className="text-sm text-slate-600">{j.machine.product.modelName} · S/N {j.machine.serialNumber}</p>
                      {j.machine.location && <p className="text-xs text-slate-500">{j.machine.location}</p>}
                    </div>
                    <Badge value={j.status} />
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
                    <Badge value={j.type} />
                    <span className="text-slate-600">
                      {formatDate(j.status === 'CLOSED' ? j.closedDate : j.scheduledDate)}
                      {j.status !== 'CLOSED' && ` · ${relativeDays(j.scheduledDate)}`}
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </AsyncContent>
    </div>
  );
}

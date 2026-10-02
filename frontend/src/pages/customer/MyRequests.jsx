// Customer's service requests and their progress.
import { useState } from 'react';
import api from '../../api/client';
import useApi from '../../hooks/useApi';
import RequestServiceModal from '../../components/RequestServiceModal';
import { AsyncContent, Badge, Button, EmptyState, ErrorBox, PageHeader, Pagination } from '../../components/ui';
import { formatDate } from '../../utils/format';

export default function MyRequests() {
  const [page, setPage] = useState(1);
  const { data, loading, error, reload } = useApi(`/requests?page=${page}&limit=10&sort=createdAt:desc`);
  const machines = useApi('/machines?limit=100');
  const [requesting, setRequesting] = useState(false);
  const [actionError, setActionError] = useState(null);

  async function cancel(id) {
    setActionError(null);
    try {
      await api.patch(`/requests/${id}`, { status: 'CANCELLED' });
      reload();
    } catch (err) {
      setActionError(err);
    }
  }

  return (
    <>
      <PageHeader title="My service requests" actions={<Button onClick={() => setRequesting(true)}>New request</Button>} />
      <ErrorBox error={actionError} />
      <AsyncContent loading={loading} error={error} reload={reload}>
        {!data?.data.length ? (
          <EmptyState title="You haven't raised any requests">Use “New request” if a machine needs attention.</EmptyState>
        ) : (
          <div className="space-y-3">
            {data.data.map((r) => (
              <div key={r.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-slate-900">{r.machine.product.modelName} · S/N {r.machine.serialNumber}</p>
                    <p className="text-xs text-slate-500">Raised {formatDate(r.createdAt)}</p>
                  </div>
                  <Badge value={r.status} />
                </div>
                <p className="mt-2 text-sm text-slate-700">{r.description}</p>
                {r.job && (
                  <p className="mt-2 text-sm text-slate-600">
                    Technician <b>{r.job.technician?.name}</b> visiting on {formatDate(r.job.scheduledDate)}.
                  </p>
                )}
                {r.status === 'NEW' && <Button size="sm" variant="ghost" className="mt-2" onClick={() => cancel(r.id)}>Cancel request</Button>}
              </div>
            ))}
            <Pagination meta={data.meta} onPage={setPage} />
          </div>
        )}
      </AsyncContent>
      <RequestServiceModal open={requesting} onClose={() => setRequesting(false)} machines={machines.data?.data || []} onSaved={reload} />
    </>
  );
}

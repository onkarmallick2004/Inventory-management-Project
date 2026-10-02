// Customer portal home: their machines with AMC / warranty status at a glance.
import { useState } from 'react';
import { Link } from 'react-router-dom';
import useApi from '../../hooks/useApi';
import { useAuth } from '../../auth/AuthContext';
import RequestServiceModal from '../../components/RequestServiceModal';
import { AsyncContent, Badge, Button, EmptyState, PageHeader } from '../../components/ui';
import { formatDate, label, relativeDays } from '../../utils/format';

export default function MyMachines() {
  const { user } = useAuth();
  const { data, loading, error, reload } = useApi('/machines?limit=100&sort=serialNumber:asc');
  const [requesting, setRequesting] = useState(false);
  const machines = data?.data || [];

  return (
    <>
      <PageHeader
        title="My machines"
        subtitle={user.customer?.companyName}
        actions={machines.length > 0 && <Button onClick={() => setRequesting(true)}>Request service</Button>}
      />
      <AsyncContent loading={loading} error={error} reload={reload}>
        {machines.length === 0 ? (
          <EmptyState title="No machines registered yet">Contact us to add your equipment.</EmptyState>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {machines.map((m) => (
              <Link key={m.id} to={`/portal/machines/${m.id}`} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md">
                <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">{label(m.product.category)}</p>
                <p className="mt-1 font-semibold text-slate-900">{m.product.name}</p>
                <p className="text-sm text-slate-500">{m.product.modelName} · S/N {m.serialNumber}</p>
                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-slate-500">AMC</p>
                    <Badge value={m.amcStatus} text={m.amcStatus === 'NONE' ? 'No AMC' : undefined} />
                    {m.amcEnd && <p className="mt-0.5 text-xs text-slate-500">until {formatDate(m.amcEnd)}</p>}
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Warranty</p>
                    <Badge value={m.warrantyStatus} />
                  </div>
                  <div className="col-span-2">
                    <p className="text-xs text-slate-500">Next service</p>
                    <p className="font-medium">{formatDate(m.nextServiceDue)} <span className="text-xs font-normal text-slate-500">({relativeDays(m.nextServiceDue)})</span></p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </AsyncContent>
      <RequestServiceModal open={requesting} onClose={() => setRequesting(false)} machines={machines} />
    </>
  );
}

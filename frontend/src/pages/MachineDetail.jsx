// Machine detail with service history and QR code. Used by admins and customers.
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../api/client';
import useApi from '../hooks/useApi';
import { useAuth } from '../auth/AuthContext';
import ServiceTimeline from '../components/ServiceTimeline';
import RequestServiceModal from '../components/RequestServiceModal';
import { AsyncContent, Badge, Button, Card, PageHeader } from '../components/ui';
import { formatDate, formatMoney, label, relativeDays } from '../utils/format';

export default function MachineDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const { data, loading, error, reload } = useApi(`/machines/${id}/history`);
  const [qrUrl, setQrUrl] = useState(null);
  const [requesting, setRequesting] = useState(false);
  const isCustomer = user.role === 'CUSTOMER';

  // The QR endpoint needs the login token, so fetch it as a blob and show it via an object URL.
  useEffect(() => {
    let url;
    api.get(`/machines/${id}/qr`, { responseType: 'blob' }).then((res) => {
      url = URL.createObjectURL(res.data);
      setQrUrl(url);
    }).catch(() => setQrUrl(null));
    return () => url && URL.revokeObjectURL(url);
  }, [id]);

  const back = isCustomer ? '/portal' : '/admin/machines';

  return (
    <AsyncContent loading={loading} error={error} reload={reload}>
      {data && (() => {
        const { machine: m, summary, timeline } = data;
        return (
          <>
            <Link to={back} className="text-sm text-slate-500 hover:text-slate-800">← Back</Link>
            <PageHeader
              title={`${m.product.modelName} · ${m.serialNumber}`}
              subtitle={`${m.product.name} at ${m.customer.companyName}${m.location ? `, ${m.location}` : ''}`}
              actions={isCustomer && <Button onClick={() => setRequesting(true)}>Request service</Button>}
            />
            <div className="grid gap-6 lg:grid-cols-3">
              <div className="space-y-6">
                <Card title="Status">
                  <dl className="grid grid-cols-2 gap-4 text-sm">
                    <Info label="Category" value={label(m.product.category)} />
                    <Info label="Installed" value={formatDate(m.installDate)} />
                    <Info label="Warranty" value={<Badge value={m.warrantyStatus} />} sub={m.warrantyEnd && `until ${formatDate(m.warrantyEnd)}`} />
                    <Info label="AMC" value={<Badge value={m.amcStatus} text={m.amcStatus === 'NONE' ? 'No AMC' : undefined} />} sub={m.amcEnd && `${formatDate(m.amcStart)} – ${formatDate(m.amcEnd)}`} />
                    <Info label="Service interval" value={`${m.serviceIntervalDays} days`} />
                    <Info label="Next service" value={formatDate(m.nextServiceDue)} sub={relativeDays(m.nextServiceDue)} />
                  </dl>
                </Card>
                <Card title="Summary">
                  <dl className="grid grid-cols-2 gap-4 text-sm">
                    <Info label="Service visits" value={summary.closedJobs} />
                    <Info label="Breakdowns" value={summary.breakdowns} />
                    <Info label="Parts cost (lifetime)" value={formatMoney(summary.totalPartsCost)} />
                    <Info label="Last service" value={formatDate(summary.lastServiceDate)} />
                  </dl>
                </Card>
                <Card title="QR code">
                  <div className="flex flex-col items-center gap-3">
                    {qrUrl ? <img src={qrUrl} alt={`QR code for ${m.serialNumber}`} className="h-48 w-48" /> : <div className="h-48 w-48 animate-pulse rounded bg-slate-100" />}
                    <p className="text-center text-xs text-slate-500">Stick this on the machine. Scanning it opens the machine page with a Request service button.</p>
                    {qrUrl && (
                      <a href={qrUrl} download={`machine-${m.serialNumber}-qr.png`}>
                        <Button variant="outline" size="sm">Download QR (PNG)</Button>
                      </a>
                    )}
                    <a href={`/m/${m.qrToken}`} target="_blank" rel="noreferrer" className="text-xs text-brand-700 hover:underline">Open public page</a>
                  </div>
                </Card>
              </div>
              <Card title="Service history" className="lg:col-span-2">
                <ServiceTimeline timeline={timeline} />
              </Card>
            </div>
            {isCustomer && (
              <RequestServiceModal open={requesting} onClose={() => setRequesting(false)} machines={[m]} onSaved={() => setRequesting(false)} />
            )}
          </>
        );
      })()}
    </AsyncContent>
  );
}

function Info({ label: text, value, sub }) {
  return (
    <div>
      <dt className="text-xs text-slate-500">{text}</dt>
      <dd className="mt-0.5 font-medium text-slate-900">{value}</dd>
      {sub && <dd className="text-xs text-slate-500">{sub}</dd>}
    </div>
  );
}

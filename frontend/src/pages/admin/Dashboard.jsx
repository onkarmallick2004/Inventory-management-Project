// Admin home: key numbers, jobs chart, and the lists that need attention today.
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../api/client';
import useApi from '../../hooks/useApi';
import JobsChart from '../../components/JobsChart';
import PartsForecast from '../../components/PartsForecast';
import { AsyncContent, Badge, Button, Card, EmptyState, PageHeader, StatTile } from '../../components/ui';
import { daysFromToday, formatDate, relativeDays } from '../../utils/format';

export default function Dashboard() {
  const navigate = useNavigate();
  const { data, loading, error, reload } = useApi('/dashboard/summary');
  const [reminderResult, setReminderResult] = useState(null);

  async function runReminders() {
    const res = await api.post('/admin/run-reminders');
    setReminderResult(res.data);
    reload();
  }

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle="What needs attention today"
        actions={<Button variant="outline" onClick={runReminders}>Run reminders now</Button>}
      />
      {reminderResult && (
        <p className="mb-4 rounded-md bg-emerald-50 px-4 py-2 text-sm text-emerald-800">
          Reminders run: {reminderResult.SERVICE_DUE} service due, {reminderResult.AMC_EXPIRING} AMC, {reminderResult.WARRANTY_EXPIRING} warranty
          notifications created, {reminderResult.emailsSent} emails sent ({reminderResult.skippedExisting} already notified).
        </p>
      )}
      <AsyncContent loading={loading} error={error} reload={reload}>
        {data && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
              <StatTile label="Open jobs" value={data.counts.openJobs} hint={`${data.counts.inProgressJobs} in progress`} onClick={() => navigate('/admin/jobs')} />
              <StatTile label="New requests" value={data.counts.newRequests} tone={data.counts.newRequests ? 'warn' : 'default'} onClick={() => navigate('/admin/requests')} />
              <StatTile label="Service due ≤ 7 days" value={data.counts.servicesDueThisWeek} hint="incl. overdue" tone={data.counts.servicesDueThisWeek ? 'warn' : 'default'} onClick={() => navigate('/admin/machines?sort=nextServiceDue:asc')} />
              <StatTile label="Low-stock parts" value={data.counts.lowStockParts} tone={data.counts.lowStockParts ? 'danger' : 'default'} onClick={() => navigate('/admin/parts?lowStock=true')} />
              <StatTile label="AMC ending ≤ 30 days" value={data.counts.amcExpiringSoon} onClick={() => navigate('/admin/machines?sort=amcEnd:asc')} />
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
              <Card title="Jobs closed per month" className="lg:col-span-2">
                <JobsChart data={data.jobsByMonth} />
              </Card>
              <Card title="Low stock" padded={false} action={<Link to="/admin/parts?lowStock=true" className="text-xs font-medium text-brand-700">View all</Link>}>
                {data.lowStock.length === 0 ? (
                  <div className="p-4"><EmptyState title="All parts above minimum" /></div>
                ) : (
                  <ul className="divide-y divide-slate-100">
                    {data.lowStock.map((p) => (
                      <li key={p.id} className="flex items-center justify-between gap-2 px-4 py-2 text-sm">
                        <div>
                          <p className="font-medium text-slate-800">{p.name}</p>
                          <p className="text-xs text-slate-500">{p.partNumber}</p>
                        </div>
                        <span className="whitespace-nowrap text-right tabular-nums">
                          <span className="font-bold text-red-700">{p.stockQty}</span>
                          <span className="text-slate-400"> / min {p.minimumLevel}</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <Card title="Service due (next 15 days)" padded={false}>
                <MachineList machines={data.serviceDue} dateField="nextServiceDue" empty="No services due" />
              </Card>
              <Card title="AMC & warranty ending (next 30 days)" padded={false}>
                <MachineList
                  machines={[
                    ...data.amcExpiring.map((m) => ({ ...m, kind: 'AMC', when: m.amcEnd })),
                    ...data.warrantyExpiring.map((m) => ({ ...m, kind: 'Warranty', when: m.warrantyEnd })),
                  ]}
                  dateField="when"
                  empty="Nothing expiring soon"
                />
              </Card>
            </div>

            <PartsForecast />
          </div>
        )}
      </AsyncContent>
    </>
  );
}

function MachineList({ machines, dateField, empty }) {
  if (!machines.length) return <div className="p-4"><EmptyState title={empty} /></div>;
  return (
    <ul className="divide-y divide-slate-100">
      {machines.map((m) => {
        const overdue = daysFromToday(m[dateField]) < 0;
        return (
          <li key={`${m.id}-${m.kind || ''}`}>
            <Link to={`/admin/machines/${m.id}`} className="flex items-center justify-between gap-3 px-4 py-2 text-sm hover:bg-brand-50">
              <div>
                <p className="font-medium text-slate-800">
                  {m.product.modelName} · {m.serialNumber}
                </p>
                <p className="text-xs text-slate-500">{m.customer.companyName}</p>
              </div>
              <div className="text-right">
                {m.kind && <Badge value="EXPIRING_SOON" text={m.kind} />}
                <p className={`text-xs ${overdue ? 'font-semibold text-red-700' : 'text-slate-600'}`}>
                  {formatDate(m[dateField])} · {relativeDays(m[dateField])}
                </p>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

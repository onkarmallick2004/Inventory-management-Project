// Service requests from customers (portal or QR page). Admin assigns a technician here.
import { useState } from 'react';
import api, { qs } from '../../api/client';
import useApi from '../../hooks/useApi';
import useTechnicians from '../../hooks/useTechnicians';
import { AsyncContent, Badge, Button, Card, ErrorBox, Field, Input, Modal, PageHeader, Pagination, Select, Table } from '../../components/ui';
import { formatDate, todayInput } from '../../utils/format';

const TABS = [['NEW', 'New'], ['ASSIGNED', 'Assigned'], ['RESOLVED', 'Resolved'], ['', 'All']];

export default function Requests() {
  const [status, setStatus] = useState('NEW');
  const [page, setPage] = useState(1);
  const [assigning, setAssigning] = useState(null);
  const { data, loading, error, reload } = useApi(`/requests?${qs({ status, page, limit: 15, sort: 'createdAt:desc' })}`);

  const columns = [
    { key: 'date', header: 'Raised', render: (r) => formatDate(r.createdAt) },
    { key: 'machine', header: 'Machine', render: (r) => (<><p className="font-medium">{r.machine.product.modelName} · {r.machine.serialNumber}</p><p className="text-xs text-slate-500">{r.customer.companyName}</p></>) },
    { key: 'desc', header: 'Problem', render: (r) => (<><p className="max-w-md">{r.description}</p><p className="text-xs text-slate-500">{r.raisedBy?.name || (r.contactName && `${r.contactName} (QR) · ${r.contactPhone}`)}</p></>) },
    { key: 'status', header: 'Status', render: (r) => (<><Badge value={r.status} />{r.job?.technician && <p className="mt-1 text-xs text-slate-500">{r.job.technician.name}</p>}</>) },
    { key: 'act', header: '', render: (r) => r.status === 'NEW' && <Button size="sm" onClick={() => setAssigning(r)}>Assign</Button> },
  ];

  return (
    <>
      <PageHeader title="Service requests" subtitle="Raised by customers in the portal or by scanning a machine's QR code" />
      <div className="mb-3 flex gap-1 overflow-x-auto">
        {TABS.map(([value, text]) => (
          <button key={text} onClick={() => { setStatus(value); setPage(1); }}
            className={`rounded-md px-3 py-1.5 text-sm font-medium ${status === value ? 'bg-steel-800 text-white' : 'text-slate-600 hover:bg-white'}`}>
            {text}
          </button>
        ))}
      </div>
      <Card padded={false}>
        <AsyncContent loading={loading} error={error} reload={reload}>
          <Table columns={columns} rows={data?.data} empty={status === 'NEW' ? 'No new requests. All caught up!' : 'No requests'} />
          <Pagination meta={data?.meta} onPage={setPage} />
        </AsyncContent>
      </Card>
      <AssignModal request={assigning} onClose={() => setAssigning(null)} onSaved={reload} />
    </>
  );
}

function AssignModal({ request, onClose, onSaved }) {
  const techs = useTechnicians(Boolean(request));
  const [form, setForm] = useState({ technicianId: '', scheduledDate: todayInput(), type: 'BREAKDOWN' });
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    if (!form.technicianId) return setError(new Error('Choose a technician'));
    setBusy(true);
    setError(null);
    try {
      await api.post(`/requests/${request.id}/assign`, { ...form, technicianId: Number(form.technicianId) });
      onSaved();
      onClose();
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={Boolean(request)} title="Assign technician" onClose={onClose}>
      {request && (
        <form onSubmit={submit} className="space-y-4" noValidate>
          <p className="rounded-md bg-slate-50 p-3 text-sm text-slate-700">{request.description}</p>
          <Field label="Technician">
            <Select value={form.technicianId} onChange={set('technicianId')}>
              <option value="">Select…</option>
              {techs.data?.data.filter((t) => t.isActive).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </Select>
          </Field>
          <Field label="Visit date"><Input type="date" value={form.scheduledDate} onChange={set('scheduledDate')} /></Field>
          <Field label="Job type">
            <Select value={form.type} onChange={set('type')}>
              <option value="BREAKDOWN">Breakdown</option>
              <option value="ROUTINE">Routine service</option>
              <option value="INSTALLATION">Installation</option>
            </Select>
          </Field>
          <ErrorBox error={error} />
          <div className="flex gap-2">
            <Button type="submit" disabled={busy}>{busy ? 'Assigning…' : 'Create job & assign'}</Button>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          </div>
        </form>
      )}
    </Modal>
  );
}

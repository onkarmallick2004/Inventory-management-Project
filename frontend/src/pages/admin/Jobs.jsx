// All service jobs, with filters and a form to schedule a new one.
import { useState } from 'react';
import api, { qs } from '../../api/client';
import useApi from '../../hooks/useApi';
import useTechnicians from '../../hooks/useTechnicians';
import { AsyncContent, Badge, Button, Card, ErrorBox, Field, Input, Modal, PageHeader, Pagination, SearchBox, Select, Table, Textarea } from '../../components/ui';
import { formatDate, formatMoney, todayInput } from '../../utils/format';

export default function Jobs() {
  const [filters, setFilters] = useState({ status: '', type: '', search: '' });
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(false);
  const [selected, setSelected] = useState(null);
  const { data, loading, error, reload } = useApi(`/jobs?${qs({ ...filters, page, limit: 15 })}`);
  const setFilter = (k) => (v) => { setFilters({ ...filters, [k]: v }); setPage(1); };

  const columns = [
    { key: 'id', header: '#', render: (j) => <span className="text-slate-500">{j.id}</span> },
    { key: 'machine', header: 'Machine', render: (j) => (<><p className="font-medium">{j.machine.product.modelName} · {j.machine.serialNumber}</p><p className="text-xs text-slate-500">{j.machine.customer.companyName}</p></>) },
    { key: 'type', header: 'Type', render: (j) => <Badge value={j.type} /> },
    { key: 'tech', header: 'Technician', render: (j) => j.technician?.name || <span className="text-amber-700">Unassigned</span> },
    { key: 'date', header: 'Scheduled', render: (j) => formatDate(j.scheduledDate) },
    { key: 'status', header: 'Status', render: (j) => <Badge value={j.status} /> },
  ];

  return (
    <>
      <PageHeader title="Service jobs" actions={<Button onClick={() => setCreating(true)}>Schedule job</Button>} />
      <Card padded={false}>
        <div className="flex flex-wrap gap-2 border-b border-slate-100 p-3">
          <SearchBox value={filters.search} onChange={setFilter('search')} placeholder="Serial, customer, notes…" />
          <div className="w-40">
            <Select value={filters.status} onChange={(e) => setFilter('status')(e.target.value)}>
              <option value="">All statuses</option>
              <option value="OPEN">Open</option>
              <option value="IN_PROGRESS">In progress</option>
              <option value="CLOSED">Closed</option>
            </Select>
          </div>
          <div className="w-40">
            <Select value={filters.type} onChange={(e) => setFilter('type')(e.target.value)}>
              <option value="">All types</option>
              <option value="ROUTINE">Routine</option>
              <option value="BREAKDOWN">Breakdown</option>
              <option value="INSTALLATION">Installation</option>
            </Select>
          </div>
        </div>
        <AsyncContent loading={loading} error={error} reload={reload}>
          <Table columns={columns} rows={data?.data} onRowClick={setSelected} empty="No jobs match these filters" />
          <Pagination meta={data?.meta} onPage={setPage} />
        </AsyncContent>
      </Card>
      <CreateJobModal open={creating} onClose={() => setCreating(false)} onSaved={reload} />
      <JobModal job={selected} onClose={() => setSelected(null)} onSaved={reload} />
    </>
  );
}

function CreateJobModal({ open, onClose, onSaved }) {
  const machines = useApi(open ? '/machines?limit=100&sort=serialNumber:asc' : null);
  const techs = useTechnicians(open);
  const empty = { machineId: '', technicianId: '', type: 'ROUTINE', scheduledDate: todayInput(), notes: '' };
  const [form, setForm] = useState(empty);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    if (!form.machineId) return setError(new Error('Choose a machine'));
    setBusy(true);
    setError(null);
    try {
      await api.post('/jobs', { ...form, machineId: Number(form.machineId), technicianId: form.technicianId ? Number(form.technicianId) : null, notes: form.notes || undefined });
      setForm(empty);
      onSaved();
      onClose();
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={open} title="Schedule a service job" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4" noValidate>
        <Field label="Machine">
          <Select value={form.machineId} onChange={set('machineId')}>
            <option value="">Select…</option>
            {machines.data?.data.map((m) => <option key={m.id} value={m.id}>{m.serialNumber} · {m.customer.companyName}</option>)}
          </Select>
        </Field>
        <Field label="Type">
          <Select value={form.type} onChange={set('type')}>
            <option value="ROUTINE">Routine service</option>
            <option value="BREAKDOWN">Breakdown</option>
            <option value="INSTALLATION">Installation</option>
          </Select>
        </Field>
        <Field label="Technician">
          <Select value={form.technicianId} onChange={set('technicianId')}>
            <option value="">Assign later</option>
            {techs.data?.data.filter((t) => t.isActive).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </Select>
        </Field>
        <Field label="Scheduled date"><Input type="date" value={form.scheduledDate} onChange={set('scheduledDate')} /></Field>
        <Field label="Notes"><Textarea value={form.notes} onChange={set('notes')} /></Field>
        <ErrorBox error={error} />
        <div className="flex gap-2">
          <Button type="submit" disabled={busy}>{busy ? 'Saving…' : 'Schedule'}</Button>
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
        </div>
      </form>
    </Modal>
  );
}

// Job details; open jobs can be re-assigned or re-scheduled.
function JobModal({ job, onClose, onSaved }) {
  const techs = useTechnicians(Boolean(job));
  const [technicianId, setTechnicianId] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  if (!job) return null;

  const tech = technicianId || job.technicianId || '';
  const date = scheduledDate || job.scheduledDate.slice(0, 10);
  const partsTotal = job.partsUsed.reduce((s, pu) => s + pu.quantity * pu.part.unitPrice, 0);

  async function save() {
    setBusy(true);
    setError(null);
    try {
      await api.put(`/jobs/${job.id}`, { technicianId: tech ? Number(tech) : null, scheduledDate: date });
      onSaved();
      close();
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  function close() {
    setTechnicianId('');
    setScheduledDate('');
    setError(null);
    onClose();
  }

  return (
    <Modal open title={`Job #${job.id}`} onClose={close} wide>
      <div className="space-y-4 text-sm">
        <div className="flex flex-wrap gap-2"><Badge value={job.type} /><Badge value={job.status} /></div>
        <p><b>{job.machine.product.modelName}</b> · S/N {job.machine.serialNumber} at {job.machine.customer.companyName}</p>
        {job.notes && <p className="rounded-md bg-slate-50 p-3 text-slate-700">{job.notes}</p>}
        {job.partsUsed.length > 0 && (
          <div>
            <p className="mb-1 font-medium">Parts used</p>
            <ul className="space-y-1">
              {job.partsUsed.map((pu) => <li key={pu.id}>{pu.quantity} × {pu.part.name} ({pu.part.partNumber})</li>)}
            </ul>
            <p className="mt-1 text-slate-500">Parts total {formatMoney(partsTotal)}</p>
          </div>
        )}
        {job.status === 'CLOSED' ? (
          <p className="text-slate-600">Closed on {formatDate(job.closedDate)} by {job.technician?.name || '—'}.</p>
        ) : (
          <div className="grid gap-4 border-t border-slate-100 pt-4 sm:grid-cols-2">
            <Field label="Technician">
              <Select value={tech} onChange={(e) => setTechnicianId(e.target.value)}>
                <option value="">Unassigned</option>
                {techs.data?.data.filter((t) => t.isActive).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </Select>
            </Field>
            <Field label="Scheduled date"><Input type="date" value={date} onChange={(e) => setScheduledDate(e.target.value)} /></Field>
            <div className="sm:col-span-2"><ErrorBox error={error} /></div>
            <div className="sm:col-span-2"><Button onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save changes'}</Button></div>
          </div>
        )}
      </div>
    </Modal>
  );
}

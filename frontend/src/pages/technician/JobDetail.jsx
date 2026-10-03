// One job, for the technician on site: change status, record parts, add notes, close.
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api, { qs } from '../../api/client';
import useApi from '../../hooks/useApi';
import { AsyncContent, Badge, Button, Card, ErrorBox, Field, Input, Modal, Select, Textarea } from '../../components/ui';
import { formatDate, formatMoney } from '../../utils/format';

export default function JobDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: job, loading, error, reload } = useApi(`/jobs/${id}`);
  const [notes, setNotes] = useState(null); // null = not edited yet
  const [actionError, setActionError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);
  const [closedResult, setClosedResult] = useState(null);

  async function run(action) {
    setBusy(true);
    setActionError(null);
    try {
      await action();
      await reload();
    } catch (err) {
      setActionError(err);
    } finally {
      setBusy(false);
    }
  }

  const currentNotes = notes ?? job?.notes ?? '';
  const isClosed = job?.status === 'CLOSED';

  const setStatus = (status) => run(() => api.patch(`/jobs/${id}/status`, { status, notes: currentNotes || undefined }));
  const saveNotes = () => run(() => api.patch(`/jobs/${id}/status`, { status: job.status, notes: currentNotes }));
  const removePart = (puId) => run(() => api.delete(`/jobs/${id}/parts/${puId}`));
  const closeJob = () =>
    run(async () => {
      const res = await api.post(`/jobs/${id}/close`, { notes: currentNotes || undefined });
      setClosedResult(res.data);
      setConfirmClose(false);
    });

  return (
    <div className="mx-auto max-w-2xl pb-24">
      <Link to="/tech" className="text-sm text-slate-500">← My jobs</Link>
      <AsyncContent loading={loading} error={error} reload={reload}>
        {job && (
          <div className="mt-2 space-y-4">
            <div className="rounded-xl bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <h1 className="text-xl font-bold text-slate-900">{job.machine.customer.companyName}</h1>
                <Badge value={job.status} />
              </div>
              <p className="text-sm text-slate-600">{job.machine.product.name} ({job.machine.product.modelName})</p>
              <p className="text-sm text-slate-600">S/N {job.machine.serialNumber}{job.machine.location && ` · ${job.machine.location}`}</p>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
                <Badge value={job.type} />
                <span className="text-slate-600">Scheduled {formatDate(job.scheduledDate)}</span>
              </div>
              {job.machine.customer.phone && (
                <a href={`tel:${job.machine.customer.phone}`} className="mt-3 inline-block text-sm font-medium text-brand-700">
                  Call customer: {job.machine.customer.phone}
                </a>
              )}
            </div>

            {closedResult && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
                <p className="font-semibold">Job closed. Stock updated.</p>
                {closedResult.lowStockParts.length > 0 && (
                  <p className="mt-1">Low stock now: {closedResult.lowStockParts.map((p) => `${p.partNumber} (${p.stockQty} left)`).join(', ')}. The office has been notified.</p>
                )}
                {job.type === 'ROUTINE' && <p className="mt-1">Next service due {formatDate(closedResult.nextServiceDue)}.</p>}
              </div>
            )}

            <ErrorBox error={actionError} />

            {!isClosed && (
              <div className="grid grid-cols-2 gap-2">
                <Button size="lg" variant={job.status === 'OPEN' ? 'outline' : 'dark'} disabled={busy || job.status === 'IN_PROGRESS'} onClick={() => setStatus('IN_PROGRESS')}>
                  {job.status === 'IN_PROGRESS' ? 'In progress' : 'Start job'}
                </Button>
                <Button size="lg" disabled={busy} onClick={() => setConfirmClose(true)}>Close job</Button>
              </div>
            )}

            <PartsSection job={job} disabled={isClosed || busy} onRemove={removePart} onAdded={reload} />

            <Card title="Notes">
              {isClosed ? (
                <p className="text-sm text-slate-700">{job.notes || 'No notes'}</p>
              ) : (
                <div className="space-y-2">
                  <Textarea rows={4} value={currentNotes} onChange={(e) => setNotes(e.target.value)} placeholder="Work done, readings, observations…" />
                  <Button variant="outline" size="sm" disabled={busy || notes === null} onClick={saveNotes}>Save notes</Button>
                </div>
              )}
            </Card>

            <Modal open={confirmClose} title="Close this job?" onClose={() => setConfirmClose(false)}>
              <div className="space-y-4 text-sm">
                <p>Closing will deduct these parts from stock:</p>
                {job.partsUsed.length ? (
                  <ul className="list-disc pl-5">{job.partsUsed.map((pu) => <li key={pu.id}>{pu.quantity} × {pu.part.name}</li>)}</ul>
                ) : (
                  <p className="text-slate-500">No parts recorded.</p>
                )}
                {job.type === 'ROUTINE' && <p className="text-slate-600">The machine's next service date will be moved forward.</p>}
                <ErrorBox error={actionError} />
                <div className="flex gap-2">
                  <Button onClick={closeJob} disabled={busy}>{busy ? 'Closing…' : 'Yes, close job'}</Button>
                  <Button variant="outline" onClick={() => setConfirmClose(false)}>Cancel</Button>
                </div>
              </div>
            </Modal>
            {isClosed && !closedResult && <p className="text-center text-sm text-slate-500">Closed on {formatDate(job.closedDate)}</p>}
            {isClosed && closedResult && <Button variant="outline" className="w-full" onClick={() => navigate('/tech')}>Back to my jobs</Button>}
          </div>
        )}
      </AsyncContent>
    </div>
  );
}

// Parts recorded on the job + a picker limited to parts that fit this machine's model.
function PartsSection({ job, disabled, onRemove, onAdded }) {
  const [adding, setAdding] = useState(false);
  const [partId, setPartId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [error, setError] = useState(null);
  const [showAll, setShowAll] = useState(false);
  const parts = useApi(adding ? `/parts?${qs({ limit: 100, productId: showAll ? '' : job.machine.productId })}` : null);
  const total = job.partsUsed.reduce((s, pu) => s + pu.quantity * pu.part.unitPrice, 0);

  async function add(e) {
    e.preventDefault();
    if (!partId) return setError(new Error('Choose a part'));
    if (!(Number(quantity) > 0)) return setError(new Error('Quantity must be at least 1'));
    setError(null);
    try {
      await api.post(`/jobs/${job.id}/parts`, { partId: Number(partId), quantity: Number(quantity) });
      setPartId('');
      setQuantity(1);
      setAdding(false);
      onAdded();
    } catch (err) {
      setError(err);
    }
  }

  const selectedPart = parts.data?.data.find((p) => p.id === Number(partId));

  return (
    <Card title="Parts used" action={!disabled && !adding && <Button size="sm" variant="outline" onClick={() => setAdding(true)}>+ Add part</Button>}>
      {job.partsUsed.length === 0 && !adding && <p className="text-sm text-slate-500">No parts recorded yet.</p>}
      {job.partsUsed.length > 0 && (
        <ul className="divide-y divide-slate-100 text-sm">
          {job.partsUsed.map((pu) => (
            <li key={pu.id} className="flex items-center justify-between gap-2 py-2">
              <div>
                <p className="font-medium">{pu.quantity} × {pu.part.name}</p>
                <p className="text-xs text-slate-500">{pu.part.partNumber} · {formatMoney(pu.part.unitPrice)} each</p>
              </div>
              {!disabled && <Button size="sm" variant="ghost" onClick={() => onRemove(pu.id)}>Remove</Button>}
            </li>
          ))}
          <li className="flex justify-between py-2 font-semibold"><span>Total</span><span>{formatMoney(total)}</span></li>
        </ul>
      )}
      {adding && (
        <form onSubmit={add} className="mt-3 space-y-3 rounded-lg bg-slate-50 p-3" noValidate>
          <Field label="Part" hint={showAll ? 'Showing all parts' : `Showing parts that fit ${job.machine.product.modelName}`}>
            <Select value={partId} onChange={(e) => setPartId(e.target.value)}>
              <option value="">{parts.loading ? 'Loading…' : 'Select…'}</option>
              {parts.data?.data.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.partNumber}) · {p.stockQty} in stock</option>)}
            </Select>
          </Field>
          <button type="button" className="text-xs text-brand-700 underline" onClick={() => setShowAll(!showAll)}>
            {showAll ? 'Only show compatible parts' : 'Show all parts'}
          </button>
          <Field label="Quantity">
            <Input type="number" min="1" inputMode="numeric" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
          </Field>
          {selectedPart && Number(quantity) > selectedPart.stockQty && (
            <p className="text-xs font-medium text-amber-700">Only {selectedPart.stockQty} in stock. The job can't be closed until the office restocks.</p>
          )}
          <ErrorBox error={error} />
          <div className="flex gap-2">
            <Button type="submit" size="sm">Add</Button>
            <Button type="button" size="sm" variant="outline" onClick={() => setAdding(false)}>Cancel</Button>
          </div>
        </form>
      )}
    </Card>
  );
}

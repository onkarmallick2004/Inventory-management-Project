// Customer form for raising a service request on one of their machines.
import { useState } from 'react';
import api from '../api/client';
import { Button, ErrorBox, Field, Modal, Select, Textarea } from './ui';

export default function RequestServiceModal({ open, onClose, machines, onSaved }) {
  const [machineId, setMachineId] = useState('');
  const [description, setDescription] = useState('');
  const [fieldError, setFieldError] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const selected = machineId || (machines.length === 1 ? machines[0].id : '');

  async function submit(e) {
    e.preventDefault();
    if (!selected) return setFieldError('Choose a machine');
    if (description.trim().length < 10) return setFieldError('Please describe the problem in at least 10 characters');
    setFieldError(null);
    setBusy(true);
    setError(null);
    try {
      await api.post('/requests', { machineId: Number(selected), description });
      setDone(true);
      setDescription('');
      onSaved?.();
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  function close() {
    setDone(false);
    onClose();
  }

  return (
    <Modal open={open || done} title="Request service" onClose={close}>
      {done ? (
        <div className="space-y-4">
          <p className="rounded-md bg-emerald-50 p-3 text-sm text-emerald-800">Your request has been sent. Our team will assign a technician and contact you.</p>
          <Button onClick={close}>Done</Button>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4" noValidate>
          {machines.length > 1 && (
            <Field label="Machine">
              <Select value={machineId} onChange={(e) => setMachineId(e.target.value)}>
                <option value="">Select…</option>
                {machines.map((m) => <option key={m.id} value={m.id}>{m.product.modelName} · {m.serialNumber}</option>)}
              </Select>
            </Field>
          )}
          <Field label="What is the problem?" error={fieldError}>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g. Machine trips on high temperature after an hour" />
          </Field>
          <ErrorBox error={error} />
          <div className="flex gap-2">
            <Button type="submit" disabled={busy}>{busy ? 'Sending…' : 'Send request'}</Button>
            <Button type="button" variant="outline" onClick={close}>Cancel</Button>
          </div>
        </form>
      )}
    </Modal>
  );
}

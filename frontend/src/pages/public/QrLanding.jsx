// Opened by scanning the QR sticker on a machine. No login needed.
// Shows the model and warranty/AMC status, and lets anyone on site request service.
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../../api/client';
import useApi from '../../hooks/useApi';
import { Logo } from '../../layouts/AppLayout';
import { Badge, Button, ErrorBox, Field, Input, Loader, Textarea } from '../../components/ui';
import { formatDate, label, relativeDays } from '../../utils/format';

export default function QrLanding() {
  const { token } = useParams();
  const { data: m, loading, error } = useApi(`/public/machines/${token}`);
  const [showForm, setShowForm] = useState(false);

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="bg-steel-900 px-4 py-3">
        <div className="mx-auto max-w-lg">
          <Logo light />
        </div>
      </header>
      <main className="mx-auto max-w-lg p-4">
        {loading && <Loader />}
        {error && <ErrorBox error={error.status === 404 ? new Error('This QR code is not linked to a machine.') : error} />}
        {m && (
          <>
            <div className="rounded-xl bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">{label(m.category)}</p>
              <h1 className="mt-1 text-2xl font-bold text-slate-900">{m.productName}</h1>
              <p className="text-sm text-slate-500">
                Model {m.modelName} · S/N {m.serialNumber}
              </p>
              <dl className="mt-5 grid grid-cols-2 gap-4 text-sm">
                <div>
                  <dt className="text-slate-500">Warranty</dt>
                  <dd className="mt-1"><Badge value={m.warrantyStatus} /></dd>
                  <dd className="mt-1 text-xs text-slate-500">until {formatDate(m.warrantyEnd)}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">AMC</dt>
                  <dd className="mt-1"><Badge value={m.amcStatus} text={m.amcStatus === 'NONE' ? 'No AMC' : undefined} /></dd>
                  {m.amcEnd && <dd className="mt-1 text-xs text-slate-500">until {formatDate(m.amcEnd)}</dd>}
                </div>
                <div>
                  <dt className="text-slate-500">Installed</dt>
                  <dd className="mt-1 font-medium">{formatDate(m.installDate)}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Next service</dt>
                  <dd className="mt-1 font-medium">{formatDate(m.nextServiceDue)}</dd>
                  <dd className="text-xs text-slate-500">{relativeDays(m.nextServiceDue)}</dd>
                </div>
              </dl>
            </div>

            {showForm ? (
              <PublicRequestForm token={token} onCancel={() => setShowForm(false)} />
            ) : (
              <Button size="lg" className="mt-4 w-full" onClick={() => setShowForm(true)}>
                Request service
              </Button>
            )}
          </>
        )}
      </main>
    </div>
  );
}

function PublicRequestForm({ token, onCancel }) {
  const [form, setForm] = useState({ contactName: '', contactPhone: '', description: '' });
  const [errors, setErrors] = useState({});
  const [error, setError] = useState(null);
  const [done, setDone] = useState(null);
  const [busy, setBusy] = useState(false);

  function validate() {
    const e = {};
    if (form.contactName.trim().length < 2) e.contactName = 'Please enter your name';
    if (!/^[0-9+\-\s]{6,}$/.test(form.contactPhone.trim())) e.contactPhone = 'Enter a valid phone number';
    if (form.description.trim().length < 10) e.description = 'Describe the problem in at least 10 characters';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function submit(e) {
    e.preventDefault();
    if (!validate()) return;
    setBusy(true);
    setError(null);
    try {
      const res = await api.post(`/public/machines/${token}/requests`, form);
      setDone(res.data);
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-900">
        <p className="font-semibold">Request #{done.id} received</p>
        <p className="mt-1 text-sm">{done.message}</p>
      </div>
    );
  }

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  return (
    <form onSubmit={submit} className="mt-4 space-y-4 rounded-xl bg-white p-5 shadow-sm" noValidate>
      <h2 className="font-semibold text-slate-900">Request service</h2>
      <Field label="Your name" error={errors.contactName}>
        <Input value={form.contactName} onChange={set('contactName')} />
      </Field>
      <Field label="Phone" error={errors.contactPhone}>
        <Input type="tel" value={form.contactPhone} onChange={set('contactPhone')} />
      </Field>
      <Field label="What is the problem?" error={errors.description}>
        <Textarea value={form.description} onChange={set('description')} placeholder="e.g. Pressure drops after 30 minutes, alarm E04 on panel" />
      </Field>
      <ErrorBox error={error} />
      <div className="flex gap-2">
        <Button type="submit" className="flex-1" disabled={busy}>
          {busy ? 'Sending…' : 'Send request'}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

// Customer companies, with an option to create a portal login when adding one.
import { useState } from 'react';
import api, { qs } from '../../api/client';
import useApi from '../../hooks/useApi';
import { AsyncContent, Button, Card, ErrorBox, Field, Input, Modal, PageHeader, Pagination, SearchBox, Table } from '../../components/ui';

export default function Customers() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [adding, setAdding] = useState(false);
  const { data, loading, error, reload } = useApi(`/customers?${qs({ search, page, limit: 15 })}`);

  const columns = [
    { key: 'company', header: 'Company', render: (c) => (<><p className="font-medium text-slate-900">{c.companyName}</p><p className="text-xs text-slate-500">{c.city}</p></>) },
    { key: 'contact', header: 'Contact', render: (c) => (<><p>{c.contactPerson}</p><p className="text-xs text-slate-500">{c.phone} · {c.email}</p></>) },
    { key: 'machines', header: 'Machines', className: 'text-right', render: (c) => c._count.machines },
  ];

  return (
    <>
      <PageHeader title="Customers" actions={<Button onClick={() => setAdding(true)}>Add customer</Button>} />
      <Card padded={false}>
        <div className="border-b border-slate-100 p-3">
          <SearchBox value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Company, contact, city…" />
        </div>
        <AsyncContent loading={loading} error={error} reload={reload}>
          <Table columns={columns} rows={data?.data} empty="No customers found" />
          <Pagination meta={data?.meta} onPage={setPage} />
        </AsyncContent>
      </Card>
      <AddCustomerModal open={adding} onClose={() => setAdding(false)} onSaved={reload} />
    </>
  );
}

function AddCustomerModal({ open, onClose, onSaved }) {
  const empty = { companyName: '', contactPerson: '', email: '', phone: '', city: '', address: '', gstNumber: '', createLogin: true, password: '' };
  const [form, setForm] = useState(empty);
  const [errors, setErrors] = useState({});
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    const errs = {};
    if (form.companyName.trim().length < 2) errs.companyName = 'Required';
    if (form.contactPerson.trim().length < 2) errs.contactPerson = 'Required';
    if (!/^\S+@\S+\.\S+$/.test(form.email)) errs.email = 'Enter a valid email';
    if (form.phone.trim().length < 6) errs.phone = 'Enter a valid phone number';
    if (form.createLogin && form.password.length < 8) errs.password = 'At least 8 characters';
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setBusy(true);
    setError(null);
    try {
      const { createLogin, password, ...customer } = form;
      const res = await api.post('/customers', customer);
      if (createLogin) {
        await api.post('/auth/register', { name: form.contactPerson, email: form.email, password, role: 'CUSTOMER', customerId: res.data.id, phone: form.phone });
      }
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
    <Modal open={open} title="Add customer" onClose={onClose} wide>
      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2" noValidate>
        <Field label="Company name" error={errors.companyName}><Input value={form.companyName} onChange={set('companyName')} /></Field>
        <Field label="Contact person" error={errors.contactPerson}><Input value={form.contactPerson} onChange={set('contactPerson')} /></Field>
        <Field label="Email" error={errors.email}><Input type="email" value={form.email} onChange={set('email')} /></Field>
        <Field label="Phone" error={errors.phone}><Input type="tel" value={form.phone} onChange={set('phone')} /></Field>
        <Field label="City"><Input value={form.city} onChange={set('city')} /></Field>
        <Field label="GST number"><Input value={form.gstNumber} onChange={set('gstNumber')} /></Field>
        <div className="sm:col-span-2"><Field label="Address"><Input value={form.address} onChange={set('address')} /></Field></div>
        <label className="flex items-center gap-2 text-sm sm:col-span-2">
          <input type="checkbox" checked={form.createLogin} onChange={(e) => setForm({ ...form, createLogin: e.target.checked })} className="h-4 w-4 accent-amber-500" />
          Create a customer portal login with this email
        </label>
        {form.createLogin && (
          <Field label="Initial password" error={errors.password} hint="Share it with the customer; they log in with their email.">
            <Input type="text" value={form.password} onChange={set('password')} />
          </Field>
        )}
        <div className="sm:col-span-2"><ErrorBox error={error} /></div>
        <div className="flex gap-2 sm:col-span-2">
          <Button type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save customer'}</Button>
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
        </div>
      </form>
    </Modal>
  );
}

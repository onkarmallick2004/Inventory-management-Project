import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api, { qs } from '../../api/client';
import useApi from '../../hooks/useApi';
import { AsyncContent, Badge, Button, Card, ErrorBox, Field, Input, Modal, PageHeader, Pagination, SearchBox, Select, Table } from '../../components/ui';
import { formatDate, relativeDays, daysFromToday, todayInput } from '../../utils/format';

export default function Machines() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [page, setPage] = useState(1);
  const [adding, setAdding] = useState(false);
  const sort = params.get('sort') || '';

  const { data, loading, error, reload } = useApi(`/machines?${qs({ page, limit: 15, search, category, sort })}`);

  const columns = [
    {
      key: 'serial',
      header: 'Machine',
      render: (m) => (
        <>
          <p className="font-medium text-slate-900">{m.product.modelName}</p>
          <p className="text-xs text-slate-500">S/N {m.serialNumber}</p>
        </>
      ),
    },
    { key: 'customer', header: 'Customer', render: (m) => m.customer.companyName },
    {
      key: 'due',
      header: 'Next service',
      render: (m) => {
        const days = daysFromToday(m.nextServiceDue);
        return (
          <>
            <p>{formatDate(m.nextServiceDue)}</p>
            <p className={`text-xs ${days !== null && days <= 15 ? 'font-semibold text-amber-700' : 'text-slate-500'} ${days < 0 ? 'text-red-700' : ''}`}>
              {relativeDays(m.nextServiceDue)}
            </p>
          </>
        );
      },
    },
    { key: 'warranty', header: 'Warranty', render: (m) => <Badge value={m.warrantyStatus} /> },
    { key: 'amc', header: 'AMC', render: (m) => <Badge value={m.amcStatus} text={m.amcStatus === 'NONE' ? 'No AMC' : undefined} /> },
  ];

  return (
    <>
      <PageHeader title="Machines" subtitle="Every compressor and vacuum pump installed at customer sites" actions={<Button onClick={() => setAdding(true)}>Add machine</Button>} />
      <Card padded={false}>
        <div className="flex flex-wrap gap-2 border-b border-slate-100 p-3">
          <SearchBox value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Serial, model, customer…" />
          <div className="w-48">
            <Select value={category} onChange={(e) => { setCategory(e.target.value); setPage(1); }}>
              <option value="">All categories</option>
              <option value="AIR_COMPRESSOR">Air compressors</option>
              <option value="VACUUM_PUMP">Vacuum pumps</option>
            </Select>
          </div>
        </div>
        <AsyncContent loading={loading} error={error} reload={reload}>
          <Table columns={columns} rows={data?.data} onRowClick={(m) => navigate(`/admin/machines/${m.id}`)} empty="No machines match your search" />
          <Pagination meta={data?.meta} onPage={setPage} />
        </AsyncContent>
      </Card>
      <AddMachineModal open={adding} onClose={() => setAdding(false)} onSaved={(m) => navigate(`/admin/machines/${m.id}`)} />
    </>
  );
}

function AddMachineModal({ open, onClose, onSaved }) {
  const products = useApi(open ? '/products?limit=100' : null);
  const customers = useApi(open ? '/customers?limit=100' : null);
  const empty = { serialNumber: '', productId: '', customerId: '', location: '', installDate: todayInput(), warrantyEnd: '', amcStart: '', amcEnd: '', serviceIntervalDays: 90 };
  const [form, setForm] = useState(empty);
  const [errors, setErrors] = useState({});
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    const errs = {};
    if (form.serialNumber.trim().length < 3) errs.serialNumber = 'Serial number is required';
    if (!form.productId) errs.productId = 'Choose a model';
    if (!form.customerId) errs.customerId = 'Choose a customer';
    if (form.amcStart && form.amcEnd && form.amcEnd <= form.amcStart) errs.amcEnd = 'AMC end must be after start';
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setBusy(true);
    setError(null);
    try {
      const body = {
        ...form,
        productId: Number(form.productId),
        customerId: Number(form.customerId),
        serviceIntervalDays: Number(form.serviceIntervalDays),
        warrantyEnd: form.warrantyEnd || null,
        amcStart: form.amcStart || null,
        amcEnd: form.amcEnd || null,
      };
      const res = await api.post('/machines', body);
      setForm(empty);
      onClose();
      onSaved(res.data);
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={open} title="Add machine" onClose={onClose} wide>
      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2" noValidate>
        <Field label="Serial number" error={errors.serialNumber}>
          <Input value={form.serialNumber} onChange={set('serialNumber')} />
        </Field>
        <Field label="Model" error={errors.productId}>
          <Select value={form.productId} onChange={set('productId')}>
            <option value="">Select…</option>
            {products.data?.data.map((p) => <option key={p.id} value={p.id}>{p.modelName} · {p.name}</option>)}
          </Select>
        </Field>
        <Field label="Customer" error={errors.customerId}>
          <Select value={form.customerId} onChange={set('customerId')}>
            <option value="">Select…</option>
            {customers.data?.data.map((c) => <option key={c.id} value={c.id}>{c.companyName}</option>)}
          </Select>
        </Field>
        <Field label="Location on site"><Input value={form.location} onChange={set('location')} /></Field>
        <Field label="Install date"><Input type="date" value={form.installDate} onChange={set('installDate')} /></Field>
        <Field label="Warranty ends"><Input type="date" value={form.warrantyEnd} onChange={set('warrantyEnd')} /></Field>
        <Field label="AMC start"><Input type="date" value={form.amcStart} onChange={set('amcStart')} /></Field>
        <Field label="AMC end" error={errors.amcEnd}><Input type="date" value={form.amcEnd} onChange={set('amcEnd')} /></Field>
        <Field label="Service interval (days)" hint="First service is due install date + interval">
          <Input type="number" min="1" value={form.serviceIntervalDays} onChange={set('serviceIntervalDays')} />
        </Field>
        <div className="sm:col-span-2"><ErrorBox error={error} /></div>
        <div className="flex gap-2 sm:col-span-2">
          <Button type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save machine'}</Button>
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
        </div>
      </form>
    </Modal>
  );
}

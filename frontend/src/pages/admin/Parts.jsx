// Parts inventory: stock levels, low-stock highlighting, restock entry and new parts.
import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import api, { qs } from '../../api/client';
import useApi from '../../hooks/useApi';
import { AsyncContent, Badge, Button, Card, ErrorBox, Field, Input, Modal, PageHeader, Pagination, SearchBox, Table } from '../../components/ui';
import { formatMoney } from '../../utils/format';

export default function Parts() {
  const [params, setParams] = useSearchParams();
  const lowOnly = params.get('lowStock') === 'true';
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [restocking, setRestocking] = useState(null);
  const [adding, setAdding] = useState(false);
  const { data, loading, error, reload } = useApi(`/parts?${qs({ page, limit: 20, search, lowStock: lowOnly ? 'true' : '' })}`);

  const columns = [
    { key: 'name', header: 'Part', render: (p) => (<><p className="font-medium text-slate-900">{p.name}</p><p className="text-xs text-slate-500">{p.partNumber}</p></>) },
    { key: 'fits', header: 'Fits models', render: (p) => <span className="text-xs text-slate-600">{p.compatibleProducts.map((c) => c.modelName).join(', ') || '—'}</span> },
    { key: 'stock', header: 'In stock', className: 'text-right', render: (p) => <span className={`tabular-nums font-semibold ${p.isLowStock ? 'text-red-700' : ''}`}>{p.stockQty}</span> },
    { key: 'min', header: 'Minimum', className: 'text-right', render: (p) => <span className="tabular-nums text-slate-500">{p.minimumLevel}</span> },
    { key: 'status', header: 'Status', render: (p) => <Badge value={p.isLowStock ? 'LOW' : 'OK'} text={p.isLowStock ? 'Low stock' : 'OK'} /> },
    { key: 'price', header: 'Unit price', className: 'text-right', render: (p) => <span className="tabular-nums">{formatMoney(p.unitPrice)}</span> },
    { key: 'act', header: '', render: (p) => <Button size="sm" variant="outline" onClick={() => setRestocking(p)}>Restock</Button> },
  ];

  return (
    <>
      <PageHeader title="Parts inventory" subtitle="Rows in red are at or below their minimum level" actions={<Button onClick={() => setAdding(true)}>Add part</Button>} />
      <Card padded={false}>
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 p-3">
          <SearchBox value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Part name or number…" />
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={lowOnly} onChange={(e) => { setParams(e.target.checked ? { lowStock: 'true' } : {}); setPage(1); }} className="h-4 w-4 accent-amber-500" />
            Show low stock only
          </label>
        </div>
        <AsyncContent loading={loading} error={error} reload={reload}>
          <Table columns={columns} rows={data?.data} rowClassName={(p) => (p.isLowStock ? 'bg-red-50/60' : '')} empty={lowOnly ? 'No parts are low on stock' : 'No parts found'} />
          <Pagination meta={data?.meta} onPage={setPage} />
        </AsyncContent>
      </Card>
      <RestockModal part={restocking} onClose={() => setRestocking(null)} onSaved={reload} />
      <AddPartModal open={adding} onClose={() => setAdding(false)} onSaved={reload} />
    </>
  );
}

function RestockModal({ part, onClose, onSaved }) {
  const [quantity, setQuantity] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    const qty = Number(quantity);
    if (!Number.isInteger(qty) || qty <= 0) return setError(new Error('Enter a whole number greater than 0'));
    setBusy(true);
    setError(null);
    try {
      await api.post(`/parts/${part.id}/restock`, { quantity: qty, note: note || undefined });
      setQuantity('');
      setNote('');
      onSaved();
      onClose();
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={Boolean(part)} title={`Restock ${part?.partNumber || ''}`} onClose={onClose}>
      {part && (
        <form onSubmit={submit} className="space-y-4" noValidate>
          <p className="text-sm text-slate-600">{part.name}: currently <b>{part.stockQty}</b> in stock (minimum {part.minimumLevel}).</p>
          <Field label="Quantity received"><Input type="number" min="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} autoFocus /></Field>
          <Field label="Note (optional)" hint="e.g. purchase order or supplier invoice number"><Input value={note} onChange={(e) => setNote(e.target.value)} /></Field>
          <ErrorBox error={error} />
          <div className="flex gap-2">
            <Button type="submit" disabled={busy}>{busy ? 'Saving…' : 'Add to stock'}</Button>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          </div>
        </form>
      )}
    </Modal>
  );
}

function AddPartModal({ open, onClose, onSaved }) {
  const products = useApi(open ? '/products?limit=100' : null);
  const empty = { partNumber: '', name: '', stockQty: 0, minimumLevel: 1, unitPrice: '', compatibleProductIds: [] };
  const [form, setForm] = useState(empty);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  function toggleProduct(id) {
    const ids = form.compatibleProductIds.includes(id) ? form.compatibleProductIds.filter((x) => x !== id) : [...form.compatibleProductIds, id];
    setForm({ ...form, compatibleProductIds: ids });
  }

  async function submit(e) {
    e.preventDefault();
    if (!form.partNumber.trim() || !form.name.trim() || form.unitPrice === '') return setError(new Error('Part number, name and price are required'));
    setBusy(true);
    setError(null);
    try {
      await api.post('/parts', { ...form, stockQty: Number(form.stockQty), minimumLevel: Number(form.minimumLevel), unitPrice: Number(form.unitPrice) });
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
    <Modal open={open} title="Add part" onClose={onClose} wide>
      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2" noValidate>
        <Field label="Part number"><Input value={form.partNumber} onChange={set('partNumber')} /></Field>
        <Field label="Name"><Input value={form.name} onChange={set('name')} /></Field>
        <Field label="Opening stock"><Input type="number" min="0" value={form.stockQty} onChange={set('stockQty')} /></Field>
        <Field label="Minimum level"><Input type="number" min="0" value={form.minimumLevel} onChange={set('minimumLevel')} /></Field>
        <Field label="Unit price (₹)"><Input type="number" min="0" value={form.unitPrice} onChange={set('unitPrice')} /></Field>
        <div className="sm:col-span-2">
          <p className="mb-1 text-sm font-medium text-slate-700">Fits models</p>
          <div className="flex flex-wrap gap-2">
            {products.data?.data.map((p) => (
              <button type="button" key={p.id} onClick={() => toggleProduct(p.id)}
                className={`rounded-full border px-3 py-1 text-xs ${form.compatibleProductIds.includes(p.id) ? 'border-brand-500 bg-brand-100 text-slate-900' : 'border-slate-300 text-slate-600'}`}>
                {p.modelName}
              </button>
            ))}
          </div>
        </div>
        <div className="sm:col-span-2"><ErrorBox error={error} /></div>
        <div className="flex gap-2 sm:col-span-2">
          <Button type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save part'}</Button>
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
        </div>
      </form>
    </Modal>
  );
}

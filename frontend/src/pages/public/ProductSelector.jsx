// Product Selector: the customer describes their need, we suggest the 3 best machines.
// Public page, so the marketing website can link to it. Scoring happens in ml-service/app/selector.
import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/client';
import { useAuth } from '../../auth/AuthContext';
import { Logo } from '../../layouts/AppLayout';
import { Badge, Button, ErrorBox, Field, Input, Select } from '../../components/ui';
import { formatMoney, label } from '../../utils/format';

const APPLICATIONS = ['general', 'food', 'pharma', 'medical', 'automotive', 'textile', 'packaging', 'plastics', 'electronics', 'woodworking', 'steel'];
const CFM_TO_LPM = 28.317;
const CRITERIA = [['airflow', 'Airflow', 40], ['pressure', 'Pressure / vacuum', 25], ['phase', 'Power supply', 15], ['application', 'Application', 20]];

export default function ProductSelector() {
  const { user } = useAuth();
  const [form, setForm] = useState({ category: 'AIR_COMPRESSOR', airflow: '', unit: 'CFM', pressure: '', phase: 'THREE', application: 'general' });
  const [errors, setErrors] = useState({});
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const isVacuum = form.category === 'VACUUM_PUMP';
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    const errs = {};
    if (!(Number(form.airflow) > 0)) errs.airflow = 'Enter the airflow you need';
    if (!(Number(form.pressure) > 0)) errs.pressure = isVacuum ? 'Enter the vacuum level in mbar' : 'Enter the working pressure in bar';
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setBusy(true);
    setError(null);
    try {
      const airflowCfm = form.unit === 'CFM' ? Number(form.airflow) : Number(form.airflow) / CFM_TO_LPM;
      // Vacuum level is entered in mbar (absolute) and sent in bar.
      const pressureBar = isVacuum ? Number(form.pressure) / 1000 : Number(form.pressure);
      const res = await api.post('/ml/product-selector', {
        category: form.category, airflowCfm: Math.round(airflowCfm * 10) / 10, pressureBar, phase: form.phase, application: form.application,
      });
      setResult(res.data);
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="bg-steel-900 px-4 py-3">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <Logo light />
          <Link to={user ? '/' : '/login'} className="text-sm font-medium text-brand-500">{user ? 'Back to app' : 'Sign in'}</Link>
        </div>
      </header>
      <main className="mx-auto max-w-5xl p-4 sm:p-6">
        <h1 className="text-2xl font-bold text-slate-900">Find the right machine</h1>
        <p className="mt-1 text-sm text-slate-500">Tell us what you need. We score every model in our range and explain the top 3.</p>

        <div className="mt-6 grid gap-6 lg:grid-cols-5">
          <form onSubmit={submit} className="space-y-4 rounded-xl bg-white p-5 shadow-sm lg:col-span-2" noValidate>
            <div className="grid grid-cols-2 gap-1 rounded-lg bg-slate-100 p-1">
              {[['AIR_COMPRESSOR', 'Air compressor'], ['VACUUM_PUMP', 'Vacuum pump']].map(([value, text]) => (
                <button type="button" key={value} onClick={() => { setForm({ ...form, category: value, pressure: '' }); setResult(null); }}
                  className={`rounded-md py-2 text-sm font-semibold ${form.category === value ? 'bg-white shadow-sm' : 'text-slate-500'}`}>
                  {text}
                </button>
              ))}
            </div>
            <Field label={isVacuum ? 'Pumping speed needed' : 'Airflow needed'} error={errors.airflow}>
              <div className="flex gap-2">
                <Input type="number" min="0" step="any" inputMode="decimal" value={form.airflow} onChange={set('airflow')} placeholder={form.unit === 'CFM' ? 'e.g. 60' : 'e.g. 1700'} />
                <div className="w-28 shrink-0"><Select value={form.unit} onChange={set('unit')}><option>CFM</option><option>LPM</option></Select></div>
              </div>
            </Field>
            <Field
              label={isVacuum ? 'Vacuum level needed (mbar absolute)' : 'Working pressure needed (bar)'}
              hint={isVacuum ? 'Lower = deeper vacuum. Packaging is typically 1–10 mbar.' : 'Most plant air systems run at 6–8 bar.'}
              error={errors.pressure}
            >
              <Input type="number" min="0" step="any" inputMode="decimal" value={form.pressure} onChange={set('pressure')} placeholder={isVacuum ? 'e.g. 5' : 'e.g. 7.5'} />
            </Field>
            <Field label="Power supply at site">
              <Select value={form.phase} onChange={set('phase')}>
                <option value="THREE">Three-phase (415 V)</option>
                <option value="SINGLE">Single-phase (230 V)</option>
              </Select>
            </Field>
            <Field label="Application">
              <Select value={form.application} onChange={set('application')}>
                {APPLICATIONS.map((a) => <option key={a} value={a}>{label(a.toUpperCase())}</option>)}
              </Select>
            </Field>
            <ErrorBox error={error} />
            <Button type="submit" size="lg" className="w-full" disabled={busy}>{busy ? 'Finding matches…' : 'Show best matches'}</Button>
          </form>

          <div className="space-y-4 lg:col-span-3">
            {!result && (
              <div className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-600">
                <p className="font-medium text-slate-800">How the score works</p>
                <ul className="mt-2 space-y-1">
                  {CRITERIA.map(([, text, w]) => <li key={text}>{text}: up to {w} points</li>)}
                </ul>
                <p className="mt-2">Pressure and power supply are must-haves: a machine that can't meet them is never ranked above one that can.</p>
              </div>
            )}
            {result?.results.length === 0 && <p className="rounded-xl bg-white p-6 text-sm">No products in this category yet.</p>}
            {result?.results.map((r) => <ResultCard key={r.product.id} r={r} />)}
          </div>
        </div>
      </main>
    </div>
  );
}

function ResultCard({ r }) {
  const p = r.product;
  return (
    <article className={`rounded-xl border bg-white p-5 shadow-sm ${r.rank === 1 && r.meetsHardRequirements ? 'border-brand-500 ring-2 ring-brand-500/30' : 'border-slate-200'}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">#{r.rank}{r.rank === 1 && r.meetsHardRequirements && ' · Best match'}</p>
          <h2 className="text-lg font-bold text-slate-900">{p.name}</h2>
          <p className="text-sm text-slate-500">
            {p.modelName} · {label(p.type)} · {p.airflowCfm} CFM · {p.category === 'VACUUM_PUMP' ? `${p.pressureBar * 1000} mbar` : `${p.pressureBar} bar`} · {p.powerKw} kW · {label(p.phase)} phase
          </p>
        </div>
        <div className="text-right">
          <p className="text-3xl font-bold text-slate-900">{r.score}</p>
          <p className="text-xs text-slate-500">/ 100</p>
        </div>
      </div>
      {!r.meetsHardRequirements && <div className="mt-2"><Badge value="EXPIRED" text="Does not meet a must-have" /></div>}
      <div className="mt-4 space-y-1.5">
        {CRITERIA.map(([key, text, max]) => (
          <div key={key} className="flex items-center gap-3 text-xs">
            <span className="w-32 shrink-0 text-slate-600">{text}</span>
            <div className="h-2 flex-1 rounded-full bg-slate-100">
              <div className="h-2 rounded-full bg-steel-800" style={{ width: `${(r.breakdown[key] / max) * 100}%` }} />
            </div>
            <span className="w-12 text-right tabular-nums text-slate-700">{r.breakdown[key]}/{max}</span>
          </div>
        ))}
      </div>
      <p className="mt-4 text-sm leading-relaxed text-slate-700">{r.explanation}</p>
      {p.price != null && <p className="mt-2 text-xs text-slate-500">Indicative price {formatMoney(p.price)}</p>}
    </article>
  );
}

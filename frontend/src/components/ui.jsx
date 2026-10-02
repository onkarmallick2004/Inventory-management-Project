// Small reusable UI building blocks. Every page is assembled from these,
// so the look stays consistent and pages stay short.
import { useEffect } from 'react';
import { label } from '../utils/format';

export function Button({ variant = 'primary', size = 'md', className = '', ...props }) {
  const variants = {
    primary: 'bg-brand-500 text-slate-900 hover:bg-brand-600 font-semibold',
    dark: 'bg-steel-800 text-white hover:bg-steel-900',
    outline: 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50',
    danger: 'bg-red-600 text-white hover:bg-red-700',
    ghost: 'text-slate-600 hover:bg-slate-100',
  };
  const sizes = { sm: 'px-2.5 py-1.5 text-xs', md: 'px-4 py-2 text-sm', lg: 'px-5 py-3 text-base' };
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-md transition disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    />
  );
}

export function Card({ title, action, children, className = '', padded = true }) {
  return (
    <section className={`rounded-lg border border-slate-200 bg-white shadow-sm ${className}`}>
      {(title || action) && (
        <header className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600">{title}</h2>
          {action}
        </header>
      )}
      <div className={padded ? 'p-4' : ''}>{children}</div>
    </section>
  );
}

export function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

// Coloured pill for any status value. Colour + text, never colour alone.
const badgeColors = {
  OPEN: 'bg-sky-100 text-sky-800',
  IN_PROGRESS: 'bg-amber-100 text-amber-800',
  CLOSED: 'bg-emerald-100 text-emerald-800',
  NEW: 'bg-sky-100 text-sky-800',
  ASSIGNED: 'bg-amber-100 text-amber-800',
  RESOLVED: 'bg-emerald-100 text-emerald-800',
  CANCELLED: 'bg-slate-200 text-slate-600',
  ACTIVE: 'bg-emerald-100 text-emerald-800',
  EXPIRING_SOON: 'bg-amber-100 text-amber-800',
  EXPIRED: 'bg-red-100 text-red-800',
  NONE: 'bg-slate-200 text-slate-600',
  LOW: 'bg-red-100 text-red-800',
  OK: 'bg-emerald-100 text-emerald-800',
  ROUTINE: 'bg-slate-100 text-slate-700',
  BREAKDOWN: 'bg-red-50 text-red-700',
  INSTALLATION: 'bg-violet-50 text-violet-700',
};

export function Badge({ value, text }) {
  return (
    <span className={`inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${badgeColors[value] || 'bg-slate-100 text-slate-700'}`}>
      {text || label(value)}
    </span>
  );
}

export function Loader({ full = false, text = 'Loading…' }) {
  return (
    <div className={`flex items-center justify-center gap-3 text-sm text-slate-500 ${full ? 'min-h-screen' : 'py-12'}`}>
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-brand-500" />
      {text}
    </div>
  );
}

export function EmptyState({ title = 'Nothing here yet', children }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 bg-white px-6 py-10 text-center">
      <p className="font-medium text-slate-700">{title}</p>
      {children && <div className="mt-1 text-sm text-slate-500">{children}</div>}
    </div>
  );
}

export function ErrorBox({ error, onRetry }) {
  if (!error) return null;
  return (
    <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
      <p className="font-medium">{error.message || String(error)}</p>
      {error.details?.length > 0 && (
        <ul className="mt-1 list-disc pl-5">
          {error.details.map((d, i) => (
            <li key={i}>{d.field ? `${d.field}: ${d.message}` : d.partNumber ? `${d.partNumber}: need ${d.required}, only ${d.inStock} in stock` : JSON.stringify(d)}</li>
          ))}
        </ul>
      )}
      {onRetry && (
        <button onClick={onRetry} className="mt-2 font-medium underline">
          Try again
        </button>
      )}
    </div>
  );
}

// Wraps a page section: shows loader, error or the content.
export function AsyncContent({ loading, error, reload, children }) {
  if (loading) return <Loader />;
  if (error) return <ErrorBox error={error} onRetry={reload} />;
  return children;
}

export function Modal({ open, title, onClose, children, wide = false }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        className={`max-h-[92vh] w-full overflow-y-auto rounded-t-xl bg-white shadow-xl sm:rounded-xl ${wide ? 'sm:max-w-2xl' : 'sm:max-w-md'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
          <h3 className="font-semibold text-slate-900">{title}</h3>
          <button onClick={onClose} className="text-2xl leading-none text-slate-400 hover:text-slate-700" aria-label="Close">
            ×
          </button>
        </header>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

// Label + input + inline error, used in every form.
export function Field({ label: text, error, hint, children }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">{text}</span>
      {children}
      {hint && !error && <span className="mt-1 block text-xs text-slate-500">{hint}</span>}
      {error && <span className="mt-1 block text-xs text-red-600">{error}</span>}
    </label>
  );
}

const inputClass =
  'w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30';

export const Input = (props) => <input className={inputClass} {...props} />;
export const Textarea = (props) => <textarea rows={3} className={inputClass} {...props} />;
export const Select = ({ children, ...props }) => (
  <select className={inputClass} {...props}>
    {children}
  </select>
);

export function SearchBox({ value, onChange, placeholder = 'Search…' }) {
  return (
    <input
      type="search"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={`${inputClass} sm:max-w-xs`}
    />
  );
}

export function Pagination({ meta, onPage }) {
  if (!meta || meta.totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 text-sm text-slate-600">
      <span>
        Page {meta.page} of {meta.totalPages} · {meta.total} total
      </span>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" disabled={meta.page <= 1} onClick={() => onPage(meta.page - 1)}>
          Previous
        </Button>
        <Button variant="outline" size="sm" disabled={meta.page >= meta.totalPages} onClick={() => onPage(meta.page + 1)}>
          Next
        </Button>
      </div>
    </div>
  );
}

// Simple responsive table. columns = [{ key, header, render?, className? }]
export function Table({ columns, rows, onRowClick, rowClassName, empty = 'No records found' }) {
  if (!rows?.length) return <EmptyState title={empty} />;
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead className="bg-slate-50">
          <tr>
            {columns.map((c) => (
              <th key={c.key} className={`whitespace-nowrap px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 ${c.className || ''}`}>
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {rows.map((row) => (
            <tr
              key={row.id}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={`${onRowClick ? 'cursor-pointer hover:bg-brand-50' : ''} ${rowClassName ? rowClassName(row) : ''}`}
            >
              {columns.map((c) => (
                <td key={c.key} className={`px-4 py-2.5 align-top ${c.className || ''}`}>
                  {c.render ? c.render(row) : row[c.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Big number tile for the dashboard.
export function StatTile({ label: text, value, hint, tone = 'default', onClick }) {
  const tones = {
    default: 'border-slate-200',
    warn: 'border-amber-300 bg-amber-50',
    danger: 'border-red-300 bg-red-50',
  };
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg border bg-white p-4 text-left shadow-sm transition hover:shadow ${tones[tone]}`}
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{text}</p>
      <p className="mt-1 text-3xl font-bold text-slate-900">{value}</p>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </button>
  );
}

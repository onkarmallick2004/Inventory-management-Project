// Next-month parts demand forecast with suggested reorder quantities (from ml-service/app/forecast).
import { useState } from 'react';
import useApi from '../hooks/useApi';
import { AsyncContent, Card, Table } from './ui';

export default function PartsForecast() {
  const { data, loading, error, reload } = useApi('/ml/parts-forecast');
  const [showAll, setShowAll] = useState(false);
  const rows = (data?.results || []).map((r) => ({ ...r, id: r.partId }));
  // By default only the parts that need ordering; the checkbox shows the full catalog.
  const visible = showAll ? rows : rows.filter((r) => r.suggestedReorder > 0);

  const columns = [
    { key: 'part', header: 'Part', render: (r) => (<><p className="font-medium text-slate-900">{r.name}</p><p className="text-xs text-slate-500">{r.partNumber}</p></>) },
    { key: 'hist', header: 'Used, last 6 months', render: (r) => <span className="font-mono text-xs text-slate-600">{r.lastMonths.join(' · ')}</span> },
    { key: 'fc', header: 'Forecast next month', className: 'text-right', render: (r) => <span className="tabular-nums">{r.forecastNextMonth.toFixed(1)}</span> },
    { key: 'method', header: 'Method', render: (r) => <span className="text-xs text-slate-500">{r.methodLabel}</span> },
    { key: 'stock', header: 'In stock / min', className: 'text-right', render: (r) => <span className="tabular-nums">{r.stockQty} / {r.minimumLevel}</span> },
    {
      key: 'reorder',
      header: 'Suggested reorder',
      className: 'text-right',
      render: (r) => <span className={`tabular-nums font-bold ${r.suggestedReorder > 0 ? 'text-brand-700' : 'text-slate-400'}`}>{r.suggestedReorder}</span>,
    },
  ];

  return (
    <Card
      title="Parts demand forecast"
      padded={false}
      action={
        data && (
          <label className="flex items-center gap-2 text-xs text-slate-600">
            <input type="checkbox" checked={showAll} onChange={(e) => setShowAll(e.target.checked)} className="accent-amber-500" />
            Show all parts
          </label>
        )
      }
    >
      <AsyncContent loading={loading} error={error} reload={reload}>
        {data && (
          <>
            <Table columns={columns} rows={visible} empty="No parts need reordering" />
            <p className="border-t border-slate-100 px-4 py-2 text-xs text-slate-500">
              Based on parts used per month ({data.months[0]} to {data.months[data.months.length - 1]}). For each part the method with the
              smallest past error is used. Reorder = forecast (rounded to whole units) + minimum level − stock; a part at or below its minimum always gets enough to rise above it.
            </p>
          </>
        )}
      </AsyncContent>
    </Card>
  );
}

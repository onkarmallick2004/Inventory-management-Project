// Vertical timeline of a machine's service jobs (from GET /machines/:id/history).
import { Badge, EmptyState } from './ui';
import { formatDate, formatMoney } from '../utils/format';

const dotColor = { ROUTINE: 'bg-slate-500', BREAKDOWN: 'bg-red-500', INSTALLATION: 'bg-violet-500' };

export default function ServiceTimeline({ timeline }) {
  if (!timeline?.length) return <EmptyState title="No service history yet" />;

  return (
    <ol className="relative ml-2 border-l-2 border-slate-200">
      {timeline.map((item) => (
        <li key={item.jobId} className="mb-6 ml-5">
          <span className={`absolute -left-[7px] mt-1.5 h-3 w-3 rounded-full ring-4 ring-white ${dotColor[item.type]}`} />
          <div className="flex flex-wrap items-center gap-2">
            <time className="text-sm font-semibold text-slate-900">{formatDate(item.date)}</time>
            <Badge value={item.type} />
            <Badge value={item.status} />
            {item.technician && <span className="text-xs text-slate-500">by {item.technician}</span>}
          </div>
          {item.notes && <p className="mt-1 text-sm text-slate-700">{item.notes}</p>}
          {item.parts.length > 0 && (
            <ul className="mt-2 space-y-0.5 rounded-md bg-slate-50 p-2 text-xs text-slate-600">
              {item.parts.map((p) => (
                <li key={p.partNumber} className="flex justify-between gap-3">
                  <span>
                    {p.quantity} × {p.name} <span className="text-slate-400">({p.partNumber})</span>
                  </span>
                  <span className="tabular-nums">{formatMoney(p.lineTotal)}</span>
                </li>
              ))}
              <li className="flex justify-between border-t border-slate-200 pt-1 font-medium text-slate-700">
                <span>Parts total</span>
                <span className="tabular-nums">{formatMoney(item.partsCost)}</span>
              </li>
            </ul>
          )}
        </li>
      ))}
    </ol>
  );
}

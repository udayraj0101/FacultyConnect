import React from 'react';

/**
 * Renders a labeled horizontal bar chart from an array of { label, value, color }.
 * Each row shows: label + count (pct%) above a progress bar.
 */
export default function BreakdownBar({ title, items, total }) {
  const sum = total ?? items.reduce((a, i) => a + (i.value || 0), 0);
  return (
    <div className="rounded-xl border border-border bg-white p-5">
      {title && (
        <h3 className="text-sm font-bold text-secondary mb-4 uppercase tracking-wide">{title}</h3>
      )}
      <div className="flex flex-col gap-3">
        {items.map(item => {
          const pct = sum > 0 ? (item.value / sum) * 100 : 0;
          return (
            <div key={item.label}>
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-secondary">{item.label}</span>
                <span className="text-text-muted tabular-nums">
                  {item.value} · {Math.round(pct)}%
                </span>
              </div>
              <div className="mt-1 h-2 w-full rounded-full bg-black/5 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${pct}%`, backgroundColor: item.color || '#6C5CE7' }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

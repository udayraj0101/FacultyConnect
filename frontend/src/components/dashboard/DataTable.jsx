import React from 'react';

/**
 * Lightweight semantic data table with header + rows. Columns is
 * [{ key, label, render?(row) }]. If render is omitted, `row[key]` is shown.
 * Styled to match dashboard cards.
 *
 * Wrap in a section/panel yourself for consistency.
 */
export default function DataTable({ columns, rows, emptyLabel = 'No data yet.' }) {
  if (!rows || rows.length === 0) {
    return (
      <div className="text-sm text-text-muted italic text-center py-8">{emptyLabel}</div>
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left">
            {columns.map(col => (
              <th
                key={col.key}
                className="py-2 pr-4 text-xs uppercase tracking-wide font-semibold text-text-muted"
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={row.id || i}
              className="border-b border-border/60 last:border-none hover:bg-muted/40 transition-colors"
            >
              {columns.map(col => (
                <td key={col.key} className="py-3 pr-4 align-top">
                  {col.render ? col.render(row) : row[col.key] ?? '—'}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

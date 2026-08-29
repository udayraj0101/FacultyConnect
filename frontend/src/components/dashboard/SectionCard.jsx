import React from 'react';

/**
 * Standardized outer section wrapper: title + subtitle in header, optional
 * trailing widget (badge/button), body content. All dashboard panels use this
 * for consistent spacing and styling.
 */
export default function SectionCard({ title, subtitle, trailing, children, className = '' }) {
  return (
    <section className={`rounded-xl border border-border bg-white p-5 ${className}`}>
      {(title || trailing) && (
        <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
          <div>
            {title && <h2 className="text-lg font-extrabold text-secondary">{title}</h2>}
            {subtitle && <p className="text-xs text-text-muted mt-0.5">{subtitle}</p>}
          </div>
          {trailing && <div className="shrink-0">{trailing}</div>}
        </div>
      )}
      {children}
    </section>
  );
}

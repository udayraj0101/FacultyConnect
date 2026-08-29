import React from 'react';
import { cn } from '../../lib/utils';

/**
 * Standardized empty state: icon, title, description, optional action.
 * Use inside a Card or standalone.
 */
export default function EmptyState({ icon, title, description, action, className }) {
  return (
    <div
      className={cn(
        'flex flex-col items-center text-center px-6 py-12 border border-dashed border-border rounded-lg bg-white/50',
        className,
      )}
    >
      {icon && (
        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-text-muted mb-3">
          {icon}
        </div>
      )}
      {title && <h3 className="text-sm font-semibold text-text-light mb-1">{title}</h3>}
      {description && (
        <p className="text-sm text-text-muted max-w-md leading-relaxed">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

import React from 'react';
import { cn } from '../../lib/utils';

/**
 * Base skeleton primitive. Pass width/height via className.
 */
export function Skeleton({ className, ...props }) {
  return (
    <div
      className={cn('animate-pulse rounded-md bg-muted/70', className)}
      aria-hidden="true"
      {...props}
    />
  );
}

/**
 * Skeleton card: mimics the shape of a content card with header + body lines.
 */
export function SkeletonCard({ lines = 3, className }) {
  return (
    <div className={cn('rounded-lg border border-border bg-white p-5 space-y-3', className)}>
      <Skeleton className="h-5 w-1/3" />
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className={`h-3 ${i === lines - 1 ? 'w-2/3' : 'w-full'}`} />
      ))}
    </div>
  );
}

/**
 * Skeleton row: for lists/tables. Renders N stacked SkeletonCards.
 */
export function SkeletonList({ count = 3, cardLines = 2 }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} lines={cardLines} />
      ))}
    </div>
  );
}

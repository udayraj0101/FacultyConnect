import React from 'react';
import { motion } from 'framer-motion';

/**
 * Big stat card with a colored icon, big number, primary label, and optional
 * secondary label. Meant to be used in a responsive grid.
 *
 * Props:
 *   icon: ReactNode (typically a lucide icon)
 *   color: hex color for the icon
 *   value: number or string
 *   label: string (primary)
 *   sublabel: string (secondary)
 *   index: number (for stagger animation delay)
 */
export default function StatCard({ icon, color = '#6C5CE7', value, label, sublabel, index = 0 }) {
  const bgColor = `${color}0F`; // hex with alpha ~6%
  return (
    <motion.div
      initial={{ y: 12, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      className="flex items-center gap-4 rounded-xl border border-border bg-white p-5"
    >
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
        style={{ backgroundColor: bgColor, color }}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-3xl font-extrabold text-secondary leading-none tabular-nums">
          {value}
        </div>
        <div className="text-sm font-semibold text-secondary mt-1">{label}</div>
        {sublabel && <div className="text-xs text-text-muted mt-0.5">{sublabel}</div>}
      </div>
    </motion.div>
  );
}

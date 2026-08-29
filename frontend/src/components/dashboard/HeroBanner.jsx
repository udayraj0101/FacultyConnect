import React from 'react';
import { motion } from 'framer-motion';
import { FACULTY_GRADIENT, FACULTY_SHADOW } from '../../lib/theme';

/**
 * Full-width gradient hero banner. Single primitive used on every faculty
 * page for brand consistency.
 *
 * Slots:
 *   avatar   — optional big initials/logo circle on the left
 *   title    — required heading text
 *   subtitle — optional supporting line
 *   icon     — decorative bg icon node (top-right, low-opacity) — preferred
 *   emoji    — decorative bg emoji (top-right, low-opacity) — fallback
 *   stats    — array of { icon, label, value } → floating glass pills
 *   actions  — optional ReactNode on the right (buttons, status)
 *   gradient — override the default faculty gradient
 */
export default function HeroBanner({
  avatar,
  title,
  subtitle,
  icon,
  emoji,
  gradient = FACULTY_GRADIENT,
  stats = [],
  actions,
}) {
  return (
    <motion.div
      initial={{ y: 12, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="relative overflow-hidden rounded-2xl md:rounded-3xl text-white px-5 sm:px-8 md:px-10 py-6 sm:py-8"
      style={{ background: gradient, boxShadow: FACULTY_SHADOW }}
    >
      {icon ? (
        <div className="absolute top-2 -right-6 sm:-right-8 opacity-10 pointer-events-none select-none [&_svg]:w-[140px] [&_svg]:h-[140px] sm:[&_svg]:w-[200px] sm:[&_svg]:h-[200px]">
          {icon}
        </div>
      ) : emoji ? (
        <div className="absolute -top-6 -right-4 text-[7rem] sm:text-[9rem] leading-none opacity-10 pointer-events-none select-none">
          {emoji}
        </div>
      ) : null}

      <div className="relative flex flex-col md:flex-row md:items-start md:justify-between gap-5 md:gap-8">
        <div className="flex items-start gap-4 sm:gap-5 min-w-0 flex-1">
          {avatar && (
            <div className="w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 rounded-2xl bg-white/15 border border-white/20 backdrop-blur flex items-center justify-center text-xl sm:text-2xl md:text-3xl font-extrabold shrink-0">
              {avatar}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold tracking-tight leading-tight break-words">
              {title}
              {emoji && !icon && !avatar && <span className="ml-2 inline-block">{emoji}</span>}
            </h1>
            {subtitle && (
              <p className="mt-1.5 text-sm md:text-base font-medium opacity-90 max-w-2xl leading-relaxed">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {actions && (
          <div className="flex flex-col sm:flex-row md:flex-col items-stretch sm:items-start md:items-end gap-2 shrink-0 md:min-w-[200px]">
            {actions}
          </div>
        )}
      </div>

      {stats.length > 0 && (
        <div className="relative mt-5 sm:mt-6 flex gap-2.5 sm:gap-3 flex-wrap">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ y: 8, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1 + i * 0.05 }}
              className="flex items-center gap-2.5 sm:gap-3 rounded-xl sm:rounded-2xl px-3 sm:px-4 py-2 sm:py-2.5 bg-white/15 border border-white/10 backdrop-blur-sm min-w-[130px]"
            >
              {stat.icon && <div className="opacity-90 shrink-0">{stat.icon}</div>}
              <div className="min-w-0">
                <div className="text-lg sm:text-xl font-extrabold leading-tight tabular-nums">
                  {stat.value}
                </div>
                <div className="text-[10px] font-semibold uppercase tracking-wider opacity-85 mt-0.5 truncate">
                  {stat.label}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
}

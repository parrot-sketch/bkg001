/**
 * Pipeline Card Component
 * 
 * Displays a single metric in the pipeline bar with icon and count.
 * Uses unified professional slate theme for understated sophistication.
 * Fully responsive across all breakpoints.
 */

import React from 'react';
import { LucideIcon } from 'lucide-react';

interface PipelineCardProps {
  label: string;
  value: number;
  icon?: LucideIcon;
  variant?: 'default' | 'accent';
  isLoading?: boolean;
}

const VARIANT_STYLES = {
  default: {
    bg: 'bg-white',
    border: 'border-slate-200',
    label: 'text-slate-500',
    value: 'text-slate-900',
  },
  accent: {
    bg: 'bg-slate-50',
    border: 'border-slate-200',
    label: 'text-slate-500',
    value: 'text-slate-900',
  },
} as const;

export function PipelineCard({
  label,
  value,
  icon: Icon,
  variant = 'default',
  isLoading,
}: PipelineCardProps): React.ReactElement {
  const styles = VARIANT_STYLES[variant];

  return (
    <div className={`${styles.bg} border ${styles.border} p-3 sm:p-4`}>
      <div className="min-w-0">
        <p className={`text-[10px] sm:text-xs font-medium ${styles.label} uppercase tracking-wide truncate`}>
          {label}
        </p>
        <p className={`text-lg sm:text-xl font-semibold ${styles.value} leading-tight`}>
          {isLoading ? '...' : value}
        </p>
      </div>
    </div>
  );
}

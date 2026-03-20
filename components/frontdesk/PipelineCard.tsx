/**
 * Pipeline Card Component
 * 
 * Displays a single metric in the pipeline bar with icon and count.
 * Uses unified professional slate theme for understated sophistication.
 */

import React from 'react';
import { LucideIcon } from 'lucide-react';

interface PipelineCardProps {
  label: string;
  value: number;
  icon: LucideIcon;
  variant?: 'default' | 'accent';
  isLoading?: boolean;
}

const VARIANT_STYLES = {
  default: {
    bg: 'bg-white',
    border: 'border-slate-200',
    iconBg: 'bg-slate-100',
    icon: 'text-slate-600',
    label: 'text-slate-500',
    value: 'text-slate-900',
  },
  accent: {
    bg: 'bg-slate-50',
    border: 'border-slate-200',
    iconBg: 'bg-white',
    icon: 'text-slate-700',
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
    <div
      className={`${styles.bg} border ${styles.border} rounded-lg shadow-sm p-4 flex items-center gap-3`}
    >
      <div className={`p-2.5 rounded-lg ${styles.iconBg}`}>
        <Icon className={`h-4 w-4 ${styles.icon}`} />
      </div>
      <div>
        <p className={`text-xs font-medium ${styles.label} uppercase tracking-wide`}>
          {label}
        </p>
        <p className={`text-xl font-semibold ${styles.value}`}>
          {isLoading ? '...' : value}
        </p>
      </div>
    </div>
  );
}

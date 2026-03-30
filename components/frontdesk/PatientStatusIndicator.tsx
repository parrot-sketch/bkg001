'use client';

/**
 * PatientStatusIndicator Component
 * 
 * Visual status indicator for patient list showing:
 * - In Queue (highest priority)
 * - Balance Due
 * - Inactive (no visits in 90+ days)
 * - Active (default)
 */

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export interface PatientStatus {
  label: string;
  color: 'blue' | 'red' | 'amber' | 'emerald';
  icon: string;
  priority: number;
}

interface PatientStatusData {
  lastVisit: Date | string | null;
  currentQueueStatus: string | null;
  outstandingBalance: number;
}

export function getPatientStatus(data: PatientStatusData): PatientStatus {
  // Priority 1: In Queue (highest priority)
  if (data.currentQueueStatus === 'WAITING' || data.currentQueueStatus === 'IN_CONSULTATION') {
    return {
      label: 'In Queue',
      color: 'blue',
      icon: '🔵',
      priority: 1,
    };
  }

  // Priority 2: Outstanding Balance
  if (data.outstandingBalance > 0) {
    return {
      label: 'Balance Due',
      color: 'red',
      icon: '🔴',
      priority: 2,
    };
  }

  // Priority 3: Inactive (no visits in 90+ days)
  const daysSinceLastVisit = data.lastVisit
    ? Math.floor((Date.now() - new Date(data.lastVisit).getTime()) / (1000 * 60 * 60 * 24))
    : 999;

  if (daysSinceLastVisit > 90) {
    return {
      label: 'Inactive',
      color: 'amber',
      icon: '🟡',
      priority: 3,
    };
  }

  // Default: Active
  return {
    label: 'Active',
    color: 'emerald',
    icon: '🟢',
    priority: 4,
  };
}

interface PatientStatusIndicatorProps {
  status: PatientStatus;
  className?: string;
}

export function PatientStatusIndicator({ status, className }: PatientStatusIndicatorProps) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    red: 'bg-red-50 text-red-700 border-red-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  };

  return (
    <Badge
      variant="outline"
      className={cn(
        'text-xs font-medium border',
        colorClasses[status.color],
        className
      )}
    >
      <span className="mr-1">{status.icon}</span>
      {status.label}
    </Badge>
  );
}

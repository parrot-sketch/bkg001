'use client';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export interface PatientStatus {
  label: string;
  color: 'blue' | 'red' | 'amber' | 'emerald';
  priority: number;
}

interface PatientStatusData {
  lastVisit: Date | string | null;
  currentQueueStatus: string | null;
  outstandingBalance: number;
}

export function getPatientStatus(data: PatientStatusData): PatientStatus {
  if (data.currentQueueStatus === 'WAITING' || data.currentQueueStatus === 'IN_CONSULTATION') {
    return { label: 'In Queue', color: 'blue', priority: 1 };
  }

  if (data.outstandingBalance > 0) {
    return { label: 'Balance Due', color: 'red', priority: 2 };
  }

  const daysSinceLastVisit = data.lastVisit
    ? Math.floor((Date.now() - new Date(data.lastVisit).getTime()) / (1000 * 60 * 60 * 24))
    : 999;

  if (daysSinceLastVisit > 90) {
    return { label: 'Inactive', color: 'amber', priority: 3 };
  }

  return { label: 'Active', color: 'emerald', priority: 4 };
}

interface PatientStatusIndicatorProps {
  status: PatientStatus;
  className?: string;
}

export function PatientStatusIndicator({ status, className }: PatientStatusIndicatorProps) {
  const colorClasses = {
    blue: 'bg-[#e6f0f1] text-[#0c5d69] border-[#0c5d69]/20',
    red: 'bg-rose-50 text-rose-700 border-rose-200',
    amber: 'bg-[#fdf6e3] text-[#78350f] border-[#DFAC0D]/30',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  };

  return (
    <Badge
      variant="outline"
      className={cn(
        'text-[10px] font-medium border',
        colorClasses[status.color],
        className
      )}
    >
      {status.label}
    </Badge>
  );
}

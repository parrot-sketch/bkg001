'use client';

import { Badge } from '@/components/ui/badge';
import { Circle, CheckCircle2, Activity } from 'lucide-react';

interface StatusBadgeProps {
  isActive: boolean;
  isCompleted: boolean;
}

export function StatusBadge({
  isActive,
  isCompleted,
}: StatusBadgeProps) {
  if (isActive) {
    return (
      <Badge
        variant="outline"
        className="bg-emerald-50 text-emerald-700 border-emerald-200/80 gap-1 text-[11px] font-medium px-2 py-0 h-5"
      >
        <Circle className="h-1.5 w-1.5 fill-emerald-500 text-emerald-500 animate-pulse" />
        In Progress
      </Badge>
    );
  }

  if (isCompleted) {
    return (
      <Badge
        variant="outline"
        className="bg-slate-50 text-slate-500 border-slate-200 gap-1 text-[11px] font-medium px-2 py-0 h-5"
      >
        <CheckCircle2 className="h-2.5 w-2.5" />
        Completed
      </Badge>
    );
  }

  return (
    <Badge
      variant="outline"
      className="bg-amber-50 text-amber-700 border-amber-200 gap-1 text-[11px] font-medium px-2 py-0 h-5"
    >
      <Activity className="h-2.5 w-2.5" />
      Not Started
    </Badge>
  );
}

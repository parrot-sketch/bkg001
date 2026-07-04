'use client';

import { cn } from '@/lib/utils';

interface DetailRowProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  className?: string;
}

export function DetailRow({ icon: Icon, label, value, className }: DetailRowProps) {
  return (
    <div className={cn('flex items-start gap-3', className)}>
      <Icon className="h-4 w-4 text-[#caa26a] shrink-0 mt-0.5" />
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wider font-semibold text-[#2c2e4b]/60">{label}</p>
        <p className="text-sm text-[#2c2e4b] font-medium">{value}</p>
      </div>
    </div>
  );
}

'use client';

import { Building2, Activity, CalendarDays, Syringe } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Theater } from './types';

interface TheaterStatsProps {
  theaters: Theater[];
}

export function TheaterStats({ theaters }: TheaterStatsProps) {
  const activeCount = theaters.filter((t) => t.is_active).length;
  const totalBookingsToday = theaters.reduce(
    (sum, t) => sum + (t.bookings?.length ?? 0),
    0
  );
  const totalProcedures = theaters.reduce(
    (sum, t) => sum + (t._count?.surgical_records ?? 0),
    0
  );

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <StatsCard
        label="Operating Suites"
        value={theaters.length}
        icon={<Building2 className="h-4 w-4" />}
        color="text-slate-600 bg-slate-50 border-slate-200"
      />
      <StatsCard
        label="Active Now"
        value={activeCount}
        icon={<Activity className="h-4 w-4" />}
        color="text-emerald-600 bg-emerald-50 border-emerald-100"
      />
      <StatsCard
        label="Cases Today"
        value={totalBookingsToday}
        icon={<CalendarDays className="h-4 w-4" />}
        color="text-indigo-600 bg-indigo-50 border-indigo-100"
      />
      <StatsCard
        label="Lifetime Cases"
        value={totalProcedures}
        icon={<Syringe className="h-4 w-4" />}
        color="text-slate-600 bg-slate-100 border-slate-200"
      />
    </div>
  );
}

function StatsCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <div className={cn('flex items-center gap-3 rounded-2xl border p-4 transition-all', color)}>
      <div className="hidden sm:flex h-9 w-9 rounded-xl items-center justify-center bg-white/50 shadow-sm">
        {icon}
      </div>
      <div>
        <p className="text-xl font-bold tracking-tight">{value}</p>
        <p className="text-[10px] font-bold uppercase tracking-widest opacity-70">{label}</p>
      </div>
    </div>
  );
}

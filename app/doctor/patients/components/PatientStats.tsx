'use client';

import { Users, Calendar, AlertTriangle, Heart } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PatientStatsProps {
  stats: {
    total: number;
    newThisMonth: number;
    withAllergies: number;
    withConditions: number;
  };
  loading: boolean;
}

export function PatientStats({ stats, loading }: PatientStatsProps) {
  const statItems = [
    { label: 'Total Patients', value: stats.total, icon: Users, color: 'text-slate-900', bg: 'bg-white' },
    { label: 'New This Month', value: stats.newThisMonth, icon: Calendar, color: 'text-blue-700', bg: 'bg-blue-50' },
    { label: 'With Allergies', value: stats.withAllergies, icon: AlertTriangle, color: 'text-amber-700', bg: 'bg-amber-50' },
    { label: 'Medical Conditions', value: stats.withConditions, icon: Heart, color: 'text-rose-700', bg: 'bg-rose-50' },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {statItems.map((stat) => (
        <div
          key={stat.label}
          className={cn("flex items-center gap-3 px-4 py-3 rounded-xl border border-slate-100", stat.bg)}
        >
          <stat.icon className={cn("h-4 w-4 flex-shrink-0", stat.color)} />
          <div>
            <p className={cn("text-lg font-bold leading-none", stat.color)}>
              {loading ? '–' : stat.value}
            </p>
            <p className="text-[10px] text-slate-500 font-medium mt-0.5">{stat.label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

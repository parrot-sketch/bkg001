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
    { 
      label: 'Total Patients', 
      value: stats.total, 
      icon: Users, 
      color: 'text-stone-900',
      subColor: 'text-stone-500',
      borderColor: 'border-stone-200',
    },
    { 
      label: 'New This Month', 
      value: stats.newThisMonth, 
      icon: Calendar, 
      color: 'text-stone-900',
      subColor: 'text-stone-500',
      borderColor: 'border-stone-200',
    },
    { 
      label: 'With Allergies', 
      value: stats.withAllergies, 
      icon: AlertTriangle, 
      color: 'text-amber-700',
      subColor: 'text-amber-600',
      borderColor: 'border-amber-200/60',
      iconBg: 'bg-amber-50',
    },
    { 
      label: 'Medical Conditions', 
      value: stats.withConditions, 
      icon: Heart, 
      color: 'text-rose-700',
      subColor: 'text-rose-600',
      borderColor: 'border-rose-200/60',
      iconBg: 'bg-rose-50',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
      {statItems.map((stat) => (
        <div
          key={stat.label}
          className={cn(
            "relative px-4 py-3.5 rounded-lg border transition-all duration-200 bg-white",
            stat.borderColor
          )}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <p className={cn("text-2xl font-semibold tracking-tight", stat.color)}>
                {loading ? '–' : stat.value}
              </p>
              <p className={cn("text-[11px] font-medium mt-1.5 tracking-wide", stat.subColor)}>
                {stat.label}
              </p>
            </div>
            <div className={cn("w-8 h-8 rounded-md flex items-center justify-center", stat.iconBg || 'bg-stone-100')}>
              <stat.icon className={cn("h-4 w-4", stat.color)} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

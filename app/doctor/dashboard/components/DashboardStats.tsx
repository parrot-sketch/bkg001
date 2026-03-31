'use client';

import { Users, CheckCircle, Activity, HeartPulse, Loader2, AlertTriangle } from 'lucide-react';
import { useDoctorDashboard, useDoctorStats } from '@/hooks/use-doctor-dashboard';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

interface DashboardStatsProps {
  isLoading: boolean;
}

export function DashboardStats({ isLoading }: DashboardStatsProps) {
  const { error, refetch } = useDoctorDashboard();
  const stats = useDoctorStats();
  const router = useRouter();

  if (error) {
    return (
      <div className="grid grid-cols-1 gap-3">
        <div className="flex items-center gap-3 p-4 rounded-xl border border-red-100 bg-red-50/50">
          <AlertTriangle className="h-5 w-5 text-red-400 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-red-700">Failed to load stats</p>
            <p className="text-xs text-red-400">{error instanceof Error ? error.message : 'An error occurred'}</p>
          </div>
          <button
            onClick={() => refetch()}
            className="text-xs font-medium text-red-600 hover:text-red-800 underline shrink-0"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const statCards = [
    {
      label: 'Patients in Queue',
      value: stats.queueLength,
      icon: Users,
      color: 'amber',
      href: '#queue',
      pulse: stats.queueLength > 0,
    },
    {
      label: 'Completed Today',
      value: stats.completedConsultationsToday,
      icon: CheckCircle,
      color: 'emerald',
      href: '/doctor/consultations',
      pulse: false,
    },
    {
      label: 'Active Surgical Cases',
      value: stats.activeSurgicalCases,
      icon: Activity,
      color: 'blue',
      href: '/doctor/surgical-cases',
      pulse: stats.activeSurgicalCases > 0,
    },
    {
      label: 'Recovery Cases',
      value: stats.recoveryCases,
      icon: HeartPulse,
      color: 'purple',
      href: '/doctor/surgical-cases?status=RECOVERY',
      pulse: stats.recoveryCases > 0,
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {statCards.map((card) => (
        <button
          key={card.label}
          onClick={() => card.href.startsWith('#') ? null : router.push(card.href)}
          disabled={card.href.startsWith('#')}
          className={cn(
            'flex items-center gap-3 p-4 rounded-xl border bg-white transition-all text-left',
            card.href.startsWith('#') 
              ? 'hover:shadow-md cursor-pointer' 
              : 'hover:shadow-md hover:-translate-y-0.5 cursor-pointer'
          )}
        >
          <div className={cn(
            'p-2.5 rounded-lg',
            card.color === 'amber' && 'bg-amber-50',
            card.color === 'emerald' && 'bg-emerald-50',
            card.color === 'blue' && 'bg-blue-50',
            card.color === 'purple' && 'bg-purple-50',
          )}>
            {isLoading ? (
              <Loader2 className={cn(
                'h-5 w-5 animate-spin',
                card.color === 'amber' && 'text-amber-500',
                card.color === 'emerald' && 'text-emerald-500',
                card.color === 'blue' && 'text-blue-500',
                card.color === 'purple' && 'text-purple-500',
              )} />
            ) : (
              <card.icon className={cn(
                'h-5 w-5',
                card.color === 'amber' && 'text-amber-600',
                card.color === 'emerald' && 'text-emerald-600',
                card.color === 'blue' && 'text-blue-600',
                card.color === 'purple' && 'text-purple-600',
              )} />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 leading-tight">
              {card.label}
            </p>
            {isLoading ? (
              <div className="h-6 w-8 bg-slate-100 animate-pulse rounded mt-1" />
            ) : (
              <p className={cn(
                'text-2xl font-bold',
                card.color === 'amber' && 'text-amber-700',
                card.color === 'emerald' && 'text-emerald-700',
                card.color === 'blue' && 'text-blue-700',
                card.color === 'purple' && 'text-purple-700',
                card.value === 0 && 'text-slate-300',
              )}>
                {card.value}
              </p>
            )}
          </div>
          {card.pulse && !isLoading && (
            <span className={cn(
              'h-2 w-2 rounded-full animate-pulse shrink-0',
              card.color === 'amber' && 'bg-amber-400',
              card.color === 'emerald' && 'bg-emerald-400',
              card.color === 'blue' && 'bg-blue-400',
              card.color === 'purple' && 'bg-purple-400',
            )} />
          )}
        </button>
      ))}
    </div>
  );
}
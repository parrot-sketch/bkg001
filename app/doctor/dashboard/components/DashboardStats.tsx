'use client';

import { Users, CheckCircle, Activity, HeartPulse, Loader2 } from 'lucide-react';
import { useDoctorDashboardStats } from '@/hooks/doctor/useDoctorDashboardStats';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

interface DashboardStatsProps {
  doctorId: string | undefined;
  isAuthenticated: boolean;
}

export function DashboardStats({ doctorId, isAuthenticated }: DashboardStatsProps) {
  const { data: stats, isLoading } = useDoctorDashboardStats(doctorId, isAuthenticated && !!doctorId);
  const router = useRouter();

  const statCards = [
    {
      label: 'Patients in Queue',
      value: stats?.queueLength ?? 0,
      icon: Users,
      color: 'amber',
      href: '#queue',
      pulse: (stats?.queueLength ?? 0) > 0,
    },
    {
      label: 'Completed Today',
      value: stats?.completedConsultationsToday ?? 0,
      icon: CheckCircle,
      color: 'emerald',
      href: '/doctor/consultations',
      pulse: false,
    },
    {
      label: 'Active Surgical Cases',
      value: stats?.activeSurgicalCases ?? 0,
      icon: Activity,
      color: 'blue',
      href: '/doctor/surgical-cases',
      pulse: (stats?.activeSurgicalCases ?? 0) > 0,
    },
    {
      label: 'Recovery Cases',
      value: stats?.recoveryCases ?? 0,
      icon: HeartPulse,
      color: 'purple',
      href: '/doctor/surgical-cases?status=RECOVERY',
      pulse: (stats?.recoveryCases ?? 0) > 0,
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

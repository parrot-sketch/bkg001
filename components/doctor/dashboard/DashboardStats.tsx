'use client';

import { Users, CheckCircle, Activity, HeartPulse, Loader2, AlertTriangle, WifiOff } from 'lucide-react';
import { useDoctorStats } from '@/hooks/use-doctor-dashboard';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

interface DashboardStatsProps {
  isLoading: boolean;
  error?: Error | null;
}

const statConfig = [
  { key: 'queueLength', label: 'In Queue', href: '#queue' },
  { key: 'completedConsultationsToday', label: 'Completed Today', href: '/doctor/consultations' },
  { key: 'activeSurgicalCases', label: 'Active Surgeries', href: '/doctor/surgical-cases' },
  { key: 'recoveryCases', label: 'In Recovery', href: '/doctor/surgical-cases?status=RECOVERY' },
] as const;

export function DashboardStats({ isLoading, error }: DashboardStatsProps) {
  const stats = useDoctorStats();
  const router = useRouter();

  // Error state
  if (error) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="col-span-full p-4 bg-red-50 border border-red-200 rounded-xl">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-red-500 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-red-700">Unable to load stats</p>
              <p className="text-xs text-red-500 mt-0.5">
                Check your connection and try refreshing
              </p>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="text-xs font-medium text-red-600 hover:text-red-800 underline shrink-0"
            >
              Refresh
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {statConfig.map(({ key, label, href }) => {
        const value = stats[key as keyof typeof stats];

        return (
          <button
            key={key}
            onClick={() => href.startsWith('#') ? null : router.push(href)}
            disabled={href.startsWith('#')}
            className={cn(
              "flex flex-col items-center justify-center p-4 bg-white border border-slate-200 rounded-xl",
              "hover:shadow-sm hover:border-slate-300 transition-all text-left",
              "disabled:cursor-default disabled:hover:shadow-none"
            )}
          >
            <p className="text-[10px] uppercase tracking-wider text-slate-400 font-medium">
              {label}
            </p>
            {isLoading ? (
              <div className="h-8 w-12 bg-slate-100 animate-pulse rounded mt-2" />
            ) : (
              <p className={cn(
                "text-3xl font-bold mt-1",
                value === 0 ? 'text-slate-300' : 'text-slate-900'
              )}>
                {value}
              </p>
            )}
          </button>
        );
      })}
    </div>
  );
}

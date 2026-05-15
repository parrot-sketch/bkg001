'use client';

import { Users, CheckCircle, Activity, HeartPulse, Loader2 } from 'lucide-react';
import { useDoctorStats } from '@/hooks/use-doctor-dashboard';
import { useRouter } from 'next/navigation';

interface DashboardStatCardsProps {
  isLoading: boolean;
}

const stats = [
  { key: 'queueLength', label: 'In Queue', href: '#queue' },
  { key: 'completedConsultationsToday', label: 'Completed Today', href: '/doctor/consultations' },
  { key: 'activeSurgicalCases', label: 'Active Surgeries', href: '/doctor/surgical-cases' },
  { key: 'recoveryCases', label: 'In Recovery', href: '/doctor/surgical-cases?status=RECOVERY' },
] as const;

export function DashboardStatCards({ isLoading }: DashboardStatCardsProps) {
  const data = useDoctorStats();
  const router = useRouter();

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {stats.map(({ key, label, href }) => {
        const value = data[key as keyof typeof data];

        return (
          <button
            key={key}
            onClick={() => href.startsWith('#') ? null : router.push(href)}
            className="flex flex-col items-center justify-center p-4 bg-white border border-slate-200 rounded-xl hover:shadow-sm hover:border-slate-300 transition-all text-center"
          >
            {isLoading ? (
              <div className="space-y-2 w-full">
                <div className="h-4 w-3/4 bg-slate-100 animate-pulse rounded mx-auto" />
                <div className="h-8 w-1/2 bg-slate-100 animate-pulse rounded mx-auto" />
              </div>
            ) : (
              <>
                <p className="text-[11px] uppercase tracking-wider text-slate-500 font-medium">
                  {label}
                </p>
                <p className={`text-3xl font-bold mt-1 ${value === 0 ? 'text-slate-300' : 'text-slate-900'}`}>
                  {value}
                </p>
              </>
            )}
          </button>
        );
      })}
    </div>
  );
}

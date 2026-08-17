'use client';

import { Users, CheckCircle, Activity, HeartPulse, Loader2 } from 'lucide-react';
import { useDoctorStats } from '@/hooks/use-doctor-dashboard';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface DashboardStatCardsProps {
  isLoading: boolean;
}

const stats = [
  { key: 'queueLength', label: 'In Queue', href: '#queue', icon: Users },
  { key: 'completedConsultationsToday', label: 'Completed Today', href: '/doctor/consultations', icon: CheckCircle },
  { key: 'activeSurgicalCases', label: 'Active Surgeries', href: '/doctor/surgical-cases', icon: Activity },
  { key: 'recoveryCases', label: 'In Recovery', href: '/doctor/surgical-cases?status=RECOVERY', icon: HeartPulse },
] as const;

export function DashboardStatCards({ isLoading }: DashboardStatCardsProps) {
  const data = useDoctorStats();
  const router = useRouter();

  return (
    <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {stats.map(({ key, label, href, icon: Icon }) => {
        const value = data[key as keyof typeof data];

        return (
          <button
            key={key}
            onClick={() => href.startsWith('#') ? null : router.push(href)}
            className="flex flex-col items-center justify-center p-4 bg-white border border-[#e7d6bf] shadow-sm hover:border-[#caa26a]/40 transition-all text-center"
          >
            {isLoading ? (
              <div className="space-y-2 w-full">
                <div className="h-4 w-3/4 bg-[#e7d6bf] animate-pulse mx-auto" />
                <div className="h-8 w-1/2 bg-[#e7d6bf] animate-pulse mx-auto" />
              </div>
            ) : (
              <>
                <p className="text-[11px] uppercase tracking-wider text-[#2c2e4b]/70 font-medium">
                  {label}
                </p>
                <p className={`text-3xl font-bold mt-1 ${value === 0 ? 'text-[#2c2e4b]/50' : 'text-[#2c2e4b]'}`}>
                  {value}
                </p>
              </>
            )}
          </button>
        );
      })}
    </section>
  );
}

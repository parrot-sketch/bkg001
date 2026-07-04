import { UserCheck, Users, UserPlus, Stethoscope } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { useDashboardStats } from '@/hooks/frontdesk/use-frontdesk-dashboard';

const iconMap = {
  'Arriving Today':   UserPlus,
  'In Waiting Room':  Users,
  'In Consultation':  Stethoscope,
  'Completed Today':  UserCheck,
} as const;

export function DashboardPipelineStats() {
  const { data: stats, isLoading, error } = useDashboardStats();

  const s = error ? null : stats;

  const today = new Date().toISOString().split('T')[0];

  const pipelineData = [
    {
      label: 'Arriving Today',
      value: s?.pendingCheckIns   ?? 0,
      href: `/frontdesk/appointments?date=${today}`,
    },
    {
      label: 'In Waiting Room',
      value: s?.checkedInPatients ?? 0,
      href: `/frontdesk/appointments?date=${today}&status=CHECKED_IN`,
    },
    {
      label: 'In Consultation',
      value: s?.inConsultation    ?? 0,
      href: `/frontdesk/appointments?date=${today}&status=IN_CONSULTATION`,
    },
    {
      label: 'Completed Today',
      value: s?.completedToday    ?? 0,
      href: `/frontdesk/appointments?date=${today}&status=COMPLETED`,
    },
  ] as const;

  return (
    <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {pipelineData.map((item) => {
        const Icon = iconMap[item.label];

        return (
          <Link
            key={item.label}
            href={item.href}
            className="group block"
          >
            <Card className="h-full border border-[#e7d6bf] bg-white shadow-sm transition-all hover:shadow-md hover:border-[#caa26a]/40">
              <CardHeader className="flex flex-row items-center justify-between pb-2 pt-3 px-4 border-b border-[#e7d6bf]">
                <CardTitle className="text-xs font-semibold text-[#2c2e4b]">
                  {item.label}
                </CardTitle>
                <div className="flex size-7 items-center justify-center rounded-md border border-[#e7d6bf] bg-[#e7d6bf]/30 text-[#caa26a]">
                  <Icon className="size-3.5" />
                </div>
              </CardHeader>
              <CardContent className="px-4 pb-3 pt-0">
                <div className="flex items-end justify-between">
                  <span className="text-2xl font-semibold tabular-nums leading-none tracking-tight text-[#2c2e4b]">
                    {isLoading ? '—' : item.value}
                  </span>
                  <span className="text-xs text-[#2c2e4b]/40 opacity-0 group-hover:opacity-100 transition-opacity">
                    View
                  </span>
                </div>
              </CardContent>
            </Card>
          </Link>
        );
      })}
    </section>
  );
}

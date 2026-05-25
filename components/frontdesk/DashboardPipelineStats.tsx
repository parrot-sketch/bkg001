'use client';

/**
 * DashboardPipelineStats
 *
 * Self-contained container — owns its own data hook.
 * If this section fails to load, the rest of the dashboard is completely unaffected.
 */

import { PipelineCard } from './PipelineCard';
import { useDashboardStats } from '@/hooks/frontdesk/use-frontdesk-dashboard';

export function DashboardPipelineStats() {
  const { data: stats, isLoading, error } = useDashboardStats();

  // On error, render silent zero-state cards — never kill the layout
  const s = error ? null : stats;

  const pipelineData = [
    { label: 'Arriving Today',   value: s?.pendingCheckIns   ?? 0, icon: undefined, variant: undefined },
    { label: 'In Waiting Room',  value: s?.checkedInPatients ?? 0, icon: undefined, variant: undefined },
    { label: 'In Consultation',  value: s?.inConsultation    ?? 0, icon: undefined, variant: undefined },
    { label: 'Completed Today',  value: s?.completedToday    ?? 0, icon: undefined, variant: 'accent' as const },
  ] as const;

  return (
    <section className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3">
      {pipelineData.map((item) => (
        <PipelineCard
          key={item.label}
          label={item.label}
          value={item.value}
          icon={item.icon}
          variant={item.variant}
          isLoading={isLoading}
        />
      ))}
    </section>
  );
}

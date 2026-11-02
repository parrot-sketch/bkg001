import { Clock, Calendar, CheckCircle, Stethoscope } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AppointmentStatus } from '@/domain/enums/AppointmentStatus';

interface AppointmentsPipelineProps {
  pipelineStats: {
    awaitingDoctor: number;
    pendingCheckIns: number;
    checkedIn: number;
    inConsultation: number;
    completed: number;
  };
  onStatusClick: (status: string) => void;
  activeStatusFilter: string;
}

const PIPELINE = [
  {
    key: AppointmentStatus.PENDING_DOCTOR_CONFIRMATION,
    label: 'Awaiting doctor',
    icon: Clock,
    countKey: 'awaitingDoctor' as const,
  },
  {
    key: AppointmentStatus.SCHEDULED,
    label: 'Ready to check in',
    icon: Calendar,
    countKey: 'pendingCheckIns' as const,
  },
  {
    key: AppointmentStatus.CHECKED_IN,
    label: 'Checked in',
    icon: CheckCircle,
    countKey: 'checkedIn' as const,
  },
  {
    key: AppointmentStatus.IN_CONSULTATION,
    label: 'In consultation',
    icon: Stethoscope,
    countKey: 'inConsultation' as const,
  },
  {
    key: AppointmentStatus.COMPLETED,
    label: 'Completed',
    icon: CheckCircle,
    countKey: 'completed' as const,
  },
] as const;

export function AppointmentsPipeline({
  pipelineStats,
  onStatusClick,
  activeStatusFilter,
}: AppointmentsPipelineProps) {
  return (
    <div className="grid grid-cols-2 divide-x divide-y divide-white/10 border border-white/15 bg-[#2c2e4b]/55 sm:grid-cols-3 lg:grid-cols-5 lg:divide-y-0">
      {PIPELINE.map((item) => {
        const count = pipelineStats[item.countKey];
        const Icon = item.icon;
        const isSelected = activeStatusFilter === item.key;
        const hasWork = count > 0;

        return (
          <button
            key={item.key}
            type="button"
            onClick={() => onStatusClick(item.key)}
            className={cn(
              'flex items-center gap-3 px-3.5 py-3 text-left transition-colors',
              isSelected ? 'bg-[#caa26a]/15' : 'hover:bg-white/5',
            )}
          >
            <Icon
              className={cn(
                'h-4 w-4 shrink-0',
                isSelected || hasWork ? 'text-[#caa26a]' : 'text-[#e7d6bf]/50',
              )}
            />
            <div className="min-w-0">
              <p className="truncate text-[10px] font-semibold uppercase tracking-[0.08em] text-[#e7d6bf]/80">
                {item.label}
              </p>
              <p
                className={cn(
                  'text-xl font-semibold tabular-nums leading-none',
                  hasWork || isSelected ? 'text-white' : 'text-white/45',
                )}
              >
                {count}
              </p>
            </div>
          </button>
        );
      })}
    </div>
  );
}

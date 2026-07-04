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

export function AppointmentsPipeline({ pipelineStats, onStatusClick, activeStatusFilter }: AppointmentsPipelineProps) {
  const { awaitingDoctor, pendingCheckIns, checkedIn, inConsultation, completed } = pipelineStats;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      <PipelineStat
        label="Awaiting Doctor"
        count={awaitingDoctor}
        icon={Clock}
        status={AppointmentStatus.PENDING_DOCTOR_CONFIRMATION}
        active={awaitingDoctor > 0}
        onClick={() => onStatusClick(AppointmentStatus.PENDING_DOCTOR_CONFIRMATION)}
        isSelected={activeStatusFilter === AppointmentStatus.PENDING_DOCTOR_CONFIRMATION}
      />
      <PipelineStat
        label="Ready to Check-in"
        count={pendingCheckIns}
        icon={Calendar}
        status={AppointmentStatus.SCHEDULED}
        active={pendingCheckIns > 0}
        onClick={() => onStatusClick(AppointmentStatus.SCHEDULED)}
        isSelected={activeStatusFilter === AppointmentStatus.SCHEDULED}
      />
      <PipelineStat
        label="Checked In"
        count={checkedIn}
        icon={CheckCircle}
        status={AppointmentStatus.CHECKED_IN}
        active={checkedIn > 0}
        onClick={() => onStatusClick(AppointmentStatus.CHECKED_IN)}
        isSelected={activeStatusFilter === AppointmentStatus.CHECKED_IN}
      />
      <PipelineStat
        label="In Consultation"
        count={inConsultation}
        icon={Stethoscope}
        status={AppointmentStatus.IN_CONSULTATION}
        active={inConsultation > 0}
        onClick={() => onStatusClick(AppointmentStatus.IN_CONSULTATION)}
        isSelected={activeStatusFilter === AppointmentStatus.IN_CONSULTATION}
      />
      <PipelineStat
        label="Completed"
        count={completed}
        icon={CheckCircle}
        status={AppointmentStatus.COMPLETED}
        active={false}
        onClick={() => onStatusClick(AppointmentStatus.COMPLETED)}
        isSelected={activeStatusFilter === AppointmentStatus.COMPLETED}
      />
    </div>
  );
}

function PipelineStat({
  label,
  count,
  icon: Icon,
  status,
  active,
  onClick,
  isSelected,
}: {
  label: string;
  count: number;
  icon: React.ComponentType<{ className?: string }>;
  status: string;
  active: boolean;
  onClick: () => void;
  isSelected: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 p-3.5 rounded-xl border bg-white transition-all text-left cursor-pointer',
        'hover:shadow-md active:scale-[0.98]',
        isSelected
          ? 'border-[#caa26a] shadow-sm ring-2 ring-[#caa26a]/20'
          : active
            ? 'border-[#caa26a]/50 hover:border-[#caa26a]/70'
            : 'border-[#e7d6bf]/60 hover:border-[#caa26a]/40'
      )}
    >
      <div className={cn('p-2 rounded-lg', active ? 'bg-[#e7d6bf]/20' : 'bg-[#e7d6bf]/10')}>
        <Icon className={cn('h-4 w-4', active ? 'text-[#caa26a]' : 'text-[#2c2e4b]/30')} />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wider font-semibold text-[#2c2e4b]/50 leading-tight">{label}</p>
        <p className={cn('text-xl font-bold', active ? 'text-[#2c2e4b]' : 'text-[#2c2e4b]/30')}>
          {count}
        </p>
      </div>
      {active && count > 0 && (
        <span className="ml-auto h-2 w-2 rounded-full animate-pulse bg-[#caa26a]" />
      )}
    </button>
  );
}

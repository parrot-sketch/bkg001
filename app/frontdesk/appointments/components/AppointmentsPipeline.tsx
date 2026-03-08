import { Clock, Calendar, CheckCircle, Stethoscope } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AppointmentsPipelineProps {
  pipelineStats: {
    awaitingDoctor: number;
    pendingCheckIns: number;
    checkedIn: number;
    inConsultation: number;
    completed: number;
  };
}

export function AppointmentsPipeline({ pipelineStats }: AppointmentsPipelineProps) {
  const { awaitingDoctor, pendingCheckIns, checkedIn, inConsultation, completed } = pipelineStats;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      <PipelineStat
        label="Awaiting Doctor"
        count={awaitingDoctor}
        icon={Clock}
        color="indigo"
        active={awaitingDoctor > 0}
      />
      <PipelineStat
        label="Ready to Check-in"
        count={pendingCheckIns}
        icon={Calendar}
        color="emerald"
        active={pendingCheckIns > 0}
      />
      <PipelineStat
        label="Checked In"
        count={checkedIn}
        icon={CheckCircle}
        color="sky"
        active={checkedIn > 0}
      />
      <PipelineStat
        label="In Consultation"
        count={inConsultation}
        icon={Stethoscope}
        color="violet"
        active={inConsultation > 0}
      />
      <PipelineStat
        label="Completed"
        count={completed}
        icon={CheckCircle}
        color="green"
        active={false}
      />
    </div>
  );
}

function PipelineStat({
  label,
  count,
  icon: Icon,
  color,
  active,
}: {
  label: string;
  count: number;
  icon: React.ComponentType<{ className?: string }>;
  color: 'indigo' | 'emerald' | 'sky' | 'violet' | 'green';
  active: boolean;
}) {
  const colorMap = {
    indigo: {
      bg: 'bg-indigo-50',
      icon: 'text-indigo-500',
      text: 'text-indigo-700',
      border: 'border-indigo-200',
    },
    emerald: {
      bg: 'bg-emerald-50',
      icon: 'text-emerald-500',
      text: 'text-emerald-700',
      border: 'border-emerald-200',
    },
    sky: {
      bg: 'bg-sky-50',
      icon: 'text-sky-500',
      text: 'text-sky-700',
      border: 'border-sky-200',
    },
    violet: {
      bg: 'bg-violet-50',
      icon: 'text-violet-500',
      text: 'text-violet-700',
      border: 'border-violet-200',
    },
    green: {
      bg: 'bg-green-50',
      icon: 'text-green-500',
      text: 'text-green-700',
      border: 'border-green-200',
    },
  };

  const c = colorMap[color];

  return (
    <div
      className={cn(
        'flex items-center gap-3 p-3.5 rounded-xl border bg-white transition-all',
        active ? c.border : 'border-slate-100'
      )}
    >
      <div className={cn('p-2 rounded-lg', c.bg)}>
        <Icon className={cn('h-4 w-4', c.icon)} />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 leading-tight">{label}</p>
        <p className={cn('text-xl font-bold', active ? c.text : 'text-slate-300')}>
          {count}
        </p>
      </div>
      {active && count > 0 && (
        <span className={cn('ml-auto h-2 w-2 rounded-full animate-pulse', c.icon.replace('text-', 'bg-'))} />
      )}
    </div>
  );
}

'use client';

import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import type { AppointmentResponseDto } from '@/application/dtos/AppointmentResponseDto';
import { AppointmentStatus } from '@/domain/enums/AppointmentStatus';

interface QueuePatientCardProps {
  appointment: AppointmentResponseDto;
  isNext: boolean;
  isStarting: boolean;
  onInitiateSwitch: (apt: AppointmentResponseDto) => void;
}

export function QueuePatientCard({
  appointment,
  isNext,
  isStarting,
  onInitiateSwitch,
}: QueuePatientCardProps) {
  const patientName = appointment.patient
    ? `${appointment.patient.firstName} ${appointment.patient.lastName}`
    : 'Unknown';
  const waitTime = appointment.checkedInAt
    ? formatDistanceToNow(new Date(appointment.checkedInAt), { addSuffix: false })
    : 'Just arrived';

  const getButtonLabel = () => {
    if (isStarting) return 'Starting...';
    if (appointment.status === AppointmentStatus.IN_CONSULTATION) return 'Resume';
    return 'Consult';
  };

  return (
    <motion.div
      layout
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.9, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 350, damping: 28 }}
      className={cn(
        'px-4 py-3 mx-0 border-b border-slate-200 bg-white',
        isNext && 'bg-slate-50',
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-medium text-slate-900 truncate">{patientName}</div>
          <div className="text-xs text-slate-500 mt-0.5">
            {appointment.patient?.fileNumber ? (
              <span className="font-mono">{appointment.patient.fileNumber}</span>
            ) : (
              '—'
            )}
            <span className="text-slate-300"> · </span>
            <span>{waitTime} wait</span>
            <span className="text-slate-300"> · </span>
            <span>{appointment.type || 'Consultation'}</span>
          </div>
        </div>

        <Button
          size="sm"
          variant="outline"
          onClick={() => onInitiateSwitch(appointment)}
          disabled={isStarting}
          className="h-8 px-3 text-xs rounded-none shrink-0"
        >
          {isStarting ? <Loader2 className="h-3 w-3 animate-spin" /> : getButtonLabel()}
        </Button>
      </div>
    </motion.div>
  );
}

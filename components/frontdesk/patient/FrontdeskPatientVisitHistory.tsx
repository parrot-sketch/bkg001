import type { ComponentType } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import {
  Calendar,
  Clock,
  Stethoscope,
  AlertCircle,
  CheckCircle,
  ArrowRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { FrontdeskPatientVisit } from '@/utils/services/patient-visits';
import { FrontdeskVisitHistoryFilters } from '@/components/frontdesk/patient/FrontdeskVisitHistoryFilters';

const STATUS_CONFIG: Record<
  string,
  { label: string; className: string; icon: ComponentType<{ className?: string }> }
> = {
  PENDING: {
    label: 'Pending',
    className: 'bg-amber-50 text-amber-800 border-amber-200',
    icon: AlertCircle,
  },
  PENDING_DOCTOR_CONFIRMATION: {
    label: 'Awaiting Doctor',
    className: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    icon: Clock,
  },
  SCHEDULED: {
    label: 'Scheduled',
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    icon: Calendar,
  },
  CONFIRMED: {
    label: 'Confirmed',
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    icon: CheckCircle,
  },
  CHECKED_IN: {
    label: 'Checked In',
    className: 'bg-sky-50 text-sky-700 border-sky-200',
    icon: CheckCircle,
  },
  READY_FOR_CONSULTATION: {
    label: 'Ready',
    className: 'bg-[#e7d6bf]/40 text-[#2c2e4b] border-[#e7d6bf]',
    icon: Stethoscope,
  },
  IN_CONSULTATION: {
    label: 'In Consultation',
    className: 'bg-violet-50 text-violet-700 border-violet-200',
    icon: Stethoscope,
  },
  COMPLETED: {
    label: 'Completed',
    className: 'bg-green-50 text-green-700 border-green-200',
    icon: CheckCircle,
  },
  CANCELLED: {
    label: 'Cancelled',
    className: 'bg-red-50 text-red-700 border-red-200',
    icon: AlertCircle,
  },
  NO_SHOW: {
    label: 'No Show',
    className: 'bg-gray-50 text-gray-600 border-gray-200',
    icon: AlertCircle,
  },
};

interface FrontdeskPatientVisitHistoryProps {
  patientId: string;
  visits: FrontdeskPatientVisit[];
  totalVisits: number;
  selectedDate?: string | null;
}

export function FrontdeskPatientVisitHistory({
  patientId,
  visits,
  totalVisits,
  selectedDate,
}: FrontdeskPatientVisitHistoryProps) {
  const hasDateFilter = Boolean(selectedDate);

  return (
    <div className="bg-white/95 backdrop-blur border border-[#e7d6bf] rounded-xl overflow-hidden">
      <div className="px-5 py-3 border-b border-[#e7d6bf] bg-[#e7d6bf]/5 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Calendar size={14} className="text-[#caa26a]" />
            <h2 className="text-xs font-bold text-[#2c2e4b] uppercase tracking-wider">
              Visit History
            </h2>
          </div>
          <span className="text-[11px] font-medium text-[#2c2e4b]/60 bg-[#e7d6bf]/30 border border-[#e7d6bf] px-2 py-0.5 rounded">
            {hasDateFilter
              ? `${visits.length} on ${format(new Date(`${selectedDate}T12:00:00`), 'MMM d, yyyy')}`
              : `${totalVisits} visit${totalVisits === 1 ? '' : 's'}`}
          </span>
        </div>

        <FrontdeskVisitHistoryFilters
          patientId={patientId}
          selectedDate={selectedDate}
          filteredCount={visits.length}
          totalCount={totalVisits}
        />
      </div>

      {visits.length === 0 ? (
        <div className="px-5 py-12 text-center">
          <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-[#e7d6bf]/30">
            <Calendar className="h-5 w-5 text-[#2c2e4b]/40" />
          </div>
          <p className="text-sm font-medium text-[#2c2e4b]">
            {hasDateFilter ? 'No visits on this date' : 'No visits yet'}
          </p>
          <p className="mt-1 text-xs text-[#2c2e4b]/50">
            {hasDateFilter
              ? 'Try another date, or clear the filter to see the full history.'
              : "Visits appear here after the patient is added to a doctor's queue or booked for an appointment."}
          </p>
        </div>
      ) : (
        <div className="divide-y divide-[#e7d6bf]/60">
          {visits.map((visit) => {
            const status = STATUS_CONFIG[visit.status] ?? {
              label: visit.status,
              className: 'bg-gray-50 text-gray-600 border-gray-200',
              icon: Calendar,
            };
            const StatusIcon = status.icon;

            return (
              <Link
                key={visit.id}
                href={`/frontdesk/appointments/${visit.id}`}
                className="flex items-center gap-4 px-5 py-3.5 hover:bg-[#e7d6bf]/15 transition-colors group"
              >
                <div className="w-12 shrink-0 text-center">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-[#2c2e4b]/50">
                    {format(visit.date, 'MMM')}
                  </p>
                  <p className="text-lg font-bold leading-none text-[#2c2e4b] tabular-nums">
                    {format(visit.date, 'd')}
                  </p>
                  <p className="text-[10px] text-[#2c2e4b]/45">{format(visit.date, 'yyyy')}</p>
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <p className="text-sm font-medium text-[#2c2e4b]">
                      {visit.time || 'Time TBD'}
                    </p>
                    <span className="text-[#e7d6bf]">·</span>
                    <p className="text-xs text-[#2c2e4b]/60 truncate">{visit.type || 'Visit'}</p>
                  </div>
                  {visit.doctorName ? (
                    <p className="mt-0.5 text-xs text-[#2c2e4b]/55 truncate">
                      {visit.doctorName}
                      {visit.doctorSpecialization ? ` · ${visit.doctorSpecialization}` : ''}
                    </p>
                  ) : null}
                  {visit.reason ? (
                    <p className="mt-1 text-xs text-[#2c2e4b]/70 truncate">
                      <span className="font-medium text-[#caa26a]">Reason:</span> {visit.reason}
                    </p>
                  ) : null}
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <span
                    className={cn(
                      'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-medium',
                      status.className,
                    )}
                  >
                    <StatusIcon className="h-3 w-3" />
                    {status.label}
                  </span>
                  <ArrowRight
                    size={14}
                    className="text-[#2c2e4b]/25 group-hover:text-[#caa26a] transition-colors"
                  />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

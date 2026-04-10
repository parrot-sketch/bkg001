'use client';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  ClipboardCheck,
  Calendar,
  Eye,
  MoreVertical,
  Clock,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import Link from 'next/link';

interface ConsultationItem {
  id: number;
  outcome_type?: string | null;
  outcomeType?: string | null;
  completed_at?: string | Date | null;
  completedAt?: string | Date | null;
  duration_minutes?: number | null;
  durationMinutes?: number | null;
  has_surgical_case?: boolean | null;
  hasCasePlan?: boolean | null;
  case_plan_id?: number | null;
  casePlanId?: number | null;
  appointment?: {
    id?: number;
    type?: string;
    patient?: {
      id?: string;
      first_name?: string;
      firstName?: string;
      last_name?: string;
      lastName?: string;
      file_number?: string;
      fileNumber?: string;
    };
  };
}

interface Props {
  consultations: ConsultationItem[];
}

export function ConsultationLedger({ consultations }: Props) {
  if (consultations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 border border-slate-200 rounded-xl text-center">
        <ClipboardCheck className="h-6 w-6 text-slate-300 mb-2" />
        <p className="text-sm font-medium text-slate-700">No completed consultations</p>
        <p className="text-xs text-slate-400 mt-1">Finalized sessions appear here</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {consultations.map((item) => (
        <ConsultationRow key={item.id} item={item} />
      ))}
    </div>
  );
}

function ConsultationRow({ item }: { item: ConsultationItem }) {
  const patient = item.appointment?.patient;
  const firstName = patient?.first_name ?? patient?.firstName ?? '';
  const lastName = patient?.last_name ?? patient?.lastName ?? '';
  const patientName = patient ? `${firstName} ${lastName}`.trim() : 'Unknown';
  const fileNumber = patient?.file_number ?? patient?.fileNumber;

  const completedAt = item.completed_at ?? item.completedAt;
  const completedTime = completedAt ? format(new Date(completedAt), 'HH:mm') : '—';
  const completedAgo = completedAt
    ? formatDistanceToNow(new Date(completedAt), { addSuffix: true })
    : '';

  const duration = item.duration_minutes ?? item.durationMinutes;
  const appointmentType = item.appointment?.type ?? 'Consultation';
  const hasSurgicalCase = item.has_surgical_case ?? item.hasCasePlan ?? false;

  return (
    <div className="group flex items-center justify-between px-4 py-3 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-colors">
      {/* Left: Patient info */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500 shrink-0">
          {firstName[0]}{lastName[0]}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-900 truncate">{patientName}</p>
          <div className="flex items-center gap-2 text-[11px] text-slate-400">
            {fileNumber && <span className="font-mono">{fileNumber}</span>}
            <span>{appointmentType}</span>
          </div>
        </div>
      </div>

      {/* Right: Time + Actions */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="text-right hidden sm:block">
          <p className="text-xs font-medium text-slate-700">{completedTime}</p>
          <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
            {duration != null && <span>{duration}min</span>}
            {completedAgo && <span>{completedAgo}</span>}
          </div>
        </div>

        {/* Contextual action menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-slate-400 hover:text-slate-700"
            >
              <MoreVertical className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            {/* View surgical case if exists (read-only) */}
            {hasSurgicalCase && (
              <DropdownMenuItem asChild className="cursor-pointer">
                <Link href={`/doctor/surgical-cases/${item.id}`}>
                  <Eye className="h-3.5 w-3.5 mr-2 text-slate-400" />
                  View Surgical Case
                </Link>
              </DropdownMenuItem>
            )}

            {/* Schedule Follow-up */}
            <DropdownMenuItem asChild className="cursor-pointer">
              <Link
                href={`/doctor/appointments/new?patientId=${patient?.id}&type=Follow-up&source=DOCTOR_FOLLOW_UP&parentConsultationId=${item.id}&parentAppointmentId=${item.appointment?.id}`}
              >
                <Calendar className="h-3.5 w-3.5 mr-2 text-purple-500" />
                Schedule Follow-up
              </Link>
            </DropdownMenuItem>

            {/* View Record */}
            <DropdownMenuItem asChild className="cursor-pointer">
              <Link href={`/doctor/consultations/${item.id}`}>
                <Eye className="h-3.5 w-3.5 mr-2 text-slate-400" />
                View Record
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Banknote,
  Calendar,
  ClipboardCheck,
  Clock3,
  Eye,
  FileText,
  MoreVertical,
  Scissors,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import Link from 'next/link';
import { ConsultationChargeSheetDrawer } from './ConsultationChargeSheetDrawer';

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
    payments?: {
      id: number;
      status: string;
      total_amount: number;
      bill_items: { id: number }[];
    } | null;
  };
}

interface Props {
  consultations: ConsultationItem[];
}

export function ConsultationLedger({ consultations }: Props) {
  const [activeChargeSheet, setActiveChargeSheet] = useState<{
    appointmentId: number;
    patientName: string;
  } | null>(null);

  if (consultations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white py-16 text-center shadow-sm">
        <ClipboardCheck className="mb-2 h-6 w-6 text-slate-300" />
        <p className="text-sm font-medium text-slate-700">No completed consultations</p>
        <p className="mt-1 text-xs text-slate-400">Finalized sessions appear here</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[860px]">
          <thead className="border-b border-slate-200 bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-[0.16em] text-slate-500">Patient</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-[0.16em] text-slate-500">Consultation</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-[0.16em] text-slate-500">Completed</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-[0.16em] text-slate-500">Charges</th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-[0.16em] text-slate-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {consultations.map((item) => (
              <ConsultationTableRow
                key={item.id}
                item={item}
                onOpenChargeSheet={(appointmentId, patientName) =>
                  setActiveChargeSheet({ appointmentId, patientName })
                }
              />
            ))}
          </tbody>
        </table>
      </div>

      <div className="divide-y divide-slate-100 md:hidden">
        {consultations.map((item) => (
          <ConsultationMobileRow
            key={item.id}
            item={item}
            onOpenChargeSheet={(appointmentId, patientName) =>
              setActiveChargeSheet({ appointmentId, patientName })
            }
          />
        ))}
      </div>

      {activeChargeSheet && (
        <ConsultationChargeSheetDrawer
          open={!!activeChargeSheet}
          onOpenChange={(open) => {
            if (!open) setActiveChargeSheet(null);
          }}
          appointmentId={activeChargeSheet.appointmentId}
          patientName={activeChargeSheet.patientName}
        />
      )}
    </div>
  );
}

function getConsultationRowMeta(item: ConsultationItem) {
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
  const payment = item.appointment?.payments;
  const hasCharges = Boolean(payment && payment.bill_items && payment.bill_items.length > 0);

  return {
    patient,
    patientName,
    firstName,
    lastName,
    fileNumber,
    completedTime,
    completedAgo,
    duration,
    appointmentType,
    hasSurgicalCase,
    hasCharges,
  };
}

function ConsultationTableRow({
  item,
  onOpenChargeSheet,
}: {
  item: ConsultationItem;
  onOpenChargeSheet: (appointmentId: number, patientName: string) => void;
}) {
  const {
    patient,
    patientName,
    firstName,
    lastName,
    fileNumber,
    completedTime,
    completedAgo,
    duration,
    appointmentType,
    hasSurgicalCase,
    hasCharges,
  } = getConsultationRowMeta(item);

  return (
    <tr className="transition-colors hover:bg-slate-50/70">
      <td className="px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-500">
            {firstName[0]}{lastName[0]}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-900">{patientName}</p>
            <p className="text-xs font-mono text-slate-500">{fileNumber || 'No file number'}</p>
          </div>
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="border-slate-200 bg-white text-[10px] uppercase tracking-[0.14em] text-slate-500">
              {appointmentType}
            </Badge>
            {hasSurgicalCase && (
              <Badge className="border border-emerald-200 bg-emerald-50 text-[10px] font-medium uppercase tracking-[0.14em] text-emerald-700">
                Surgical Case
              </Badge>
            )}
          </div>
          <p className="text-xs text-slate-500">Consultation ID #{item.id}</p>
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="space-y-1">
          <p className="text-sm font-medium text-slate-800">{completedTime}</p>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            {duration != null && (
              <span className="inline-flex items-center gap-1">
                <Clock3 className="h-3 w-3" />
                {duration} min
              </span>
            )}
            {completedAgo && <span>{completedAgo}</span>}
          </div>
        </div>
      </td>
      <td className="px-4 py-3">
        {hasCharges ? (
          <div className="space-y-1">
            <p className="text-sm font-medium text-emerald-700">Charge sheet added</p>
            <p className="text-xs text-slate-500">Ready for updates or final review</p>
          </div>
        ) : (
          <div className="space-y-1">
            <p className="text-sm font-medium text-slate-700">No charges yet</p>
            <p className="text-xs text-slate-500">Add consultation fee or billable items</p>
          </div>
        )}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center justify-end gap-2">
          {item.appointment?.id && (
            <Button
              variant="outline"
              size="sm"
              className="h-8 border-slate-200 bg-white text-xs"
              onClick={() => onOpenChargeSheet(item.appointment!.id!, patientName)}
            >
              <Banknote className="mr-1.5 h-3.5 w-3.5 text-emerald-600" />
              Charge Sheet
            </Button>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-slate-400 hover:text-slate-700"
              >
                <MoreVertical className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {item.appointment?.id && (
                <DropdownMenuItem
                  onClick={() => onOpenChargeSheet(item.appointment!.id!, patientName)}
                  className="cursor-pointer font-medium text-slate-700"
                >
                  <Banknote className="mr-2 h-3.5 w-3.5 text-emerald-600" />
                  Charge Sheet
                </DropdownMenuItem>
              )}

              {hasSurgicalCase && (
                <DropdownMenuItem asChild className="cursor-pointer">
                  <Link href={`/doctor/surgical-cases/${item.id}`}>
                    <Scissors className="mr-2 h-3.5 w-3.5 text-slate-400" />
                    View Surgical Case
                  </Link>
                </DropdownMenuItem>
              )}

              <DropdownMenuItem asChild className="cursor-pointer">
                <Link
                  href={`/doctor/appointments/new?patientId=${patient?.id}&type=Follow-up&source=DOCTOR_FOLLOW_UP&parentConsultationId=${item.id}&parentAppointmentId=${item.appointment?.id}`}
                >
                  <Calendar className="mr-2 h-3.5 w-3.5 text-slate-400" />
                  Schedule Follow-up
                </Link>
              </DropdownMenuItem>

              <DropdownMenuItem asChild className="cursor-pointer">
                <Link href={`/doctor/consultations/${item.id}`}>
                  <Eye className="mr-2 h-3.5 w-3.5 text-slate-400" />
                  View Record
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </td>
    </tr>
  );
}

function ConsultationMobileRow({
  item,
  onOpenChargeSheet,
}: {
  item: ConsultationItem;
  onOpenChargeSheet: (appointmentId: number, patientName: string) => void;
}) {
  const {
    patientName,
    fileNumber,
    completedTime,
    completedAgo,
    appointmentType,
    hasCharges,
  } = getConsultationRowMeta(item);

  return (
    <div className="space-y-3 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-900">{patientName}</p>
          <p className="text-xs font-mono text-slate-500">{fileNumber || 'No file number'}</p>
        </div>
        <Badge variant="outline" className="border-slate-200 bg-white text-[10px] uppercase tracking-[0.14em] text-slate-500">
          {appointmentType}
        </Badge>
      </div>

      <div className="flex items-center gap-3 text-xs text-slate-500">
        <span className="inline-flex items-center gap-1">
          <Clock3 className="h-3 w-3" />
          {completedTime}
        </span>
        {completedAgo && <span>{completedAgo}</span>}
      </div>

      <div className="rounded-xl bg-slate-50 p-3">
        <p className="text-xs font-medium text-slate-700">
          {hasCharges ? 'Charge sheet added' : 'No charges yet'}
        </p>
        <p className="mt-1 text-xs text-slate-500">
          {hasCharges ? 'You can reopen and adjust the bill.' : 'Append consultation fees or billable items.'}
        </p>
      </div>

      <div className="flex gap-2">
        {item.appointment?.id && (
          <Button
            variant="outline"
            size="sm"
            className="flex-1 border-slate-200"
            onClick={() => onOpenChargeSheet(item.appointment!.id!, patientName)}
          >
            <Banknote className="mr-1.5 h-3.5 w-3.5 text-emerald-600" />
            Charge Sheet
          </Button>
        )}
        <Button asChild variant="outline" size="sm" className="flex-1 border-slate-200">
          <Link href={`/doctor/consultations/${item.id}`}>
            <FileText className="mr-1.5 h-3.5 w-3.5" />
            View Record
          </Link>
        </Button>
      </div>
    </div>
  );
}

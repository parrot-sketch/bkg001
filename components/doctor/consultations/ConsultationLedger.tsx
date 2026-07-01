'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
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
  Pencil,
  Scissors,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import Link from 'next/link';
import { ConsultationChargeSheetDrawer } from './ConsultationChargeSheetDrawer';
import { Card, CardContent } from '@/components/ui/card';

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
      <Card className="border border-slate-200 bg-white">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <ClipboardCheck className="h-6 w-6 text-slate-300 mb-2" />
          <p className="text-sm font-medium text-[#121c1d]">No completed consultations</p>
          <p className="mt-1 text-xs text-slate-400">Finalized sessions appear here</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="border border-slate-200 bg-white rounded-xl overflow-hidden divide-y divide-slate-100">
      {consultations.map((item) => (
        <ConsultationRow
          key={item.id}
          item={item}
          onOpenChargeSheet={(appointmentId, patientName) =>
            setActiveChargeSheet({ appointmentId, patientName })
          }
        />
      ))}

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

function ConsultationRow({
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
    <div className="flex items-center justify-between gap-4 px-4 py-3.5 hover:bg-slate-50/50 transition-colors">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className="h-9 w-9 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
          <span className="text-xs font-semibold text-slate-600">
            {firstName[0]}{lastName[0]}
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-[#121c1d] truncate">{patientName}</p>
          <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
            <span className="font-mono">{fileNumber || 'No file #'}</span>
            <span className="text-slate-200">.</span>
            <span>{appointmentType}</span>
          </div>
        </div>
      </div>

      <div className="hidden md:flex items-center gap-6 shrink-0">
        <div className="text-right">
          <p className="text-sm font-medium text-[#121c1d]">{completedTime}</p>
          {duration != null && (
            <p className="text-xs text-slate-400">{duration} min</p>
          )}
        </div>

        <div className="w-32">
          {hasCharges ? (
            <div>
              <p className="text-xs font-medium text-emerald-700">Charged</p>
              <p className="text-[10px] text-slate-400">Ready for review</p>
            </div>
          ) : (
            <div>
              <p className="text-xs font-medium text-slate-500">No charges</p>
              <p className="text-[10px] text-slate-400">Add fee or items</p>
            </div>
          )}
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-600">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            {item.appointment?.id && (
              <DropdownMenuItem onClick={() => onOpenChargeSheet(item.appointment!.id!, patientName)}>
                <Banknote className="h-4 w-4 mr-2 text-emerald-600" />
                Charge Sheet
              </DropdownMenuItem>
            )}
            {hasSurgicalCase && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href={`/doctor/surgical-cases/${item.id}`}>
                    <Scissors className="h-4 w-4 mr-2 text-slate-400" />
                    Surgical Case
                  </Link>
                </DropdownMenuItem>
              </>
            )}
            <DropdownMenuSeparator />
<DropdownMenuItem asChild>
               <Link href={`/doctor/consultations/${item.id}/edit`}>
                 <Pencil className="h-4 w-4 mr-2 text-slate-400" />
                 Edit Record
               </Link>
             </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={`/doctor/consultations/${item.id}`}>
                <Eye className="h-4 w-4 mr-2 text-slate-400" />
                View Record
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="md:hidden flex items-center gap-2">
        {hasCharges ? (
          <span className="text-xs font-medium text-emerald-700">Charged</span>
        ) : (
          <span className="text-xs text-slate-400">No charges</span>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            {item.appointment?.id && (
              <DropdownMenuItem onClick={() => onOpenChargeSheet(item.appointment!.id!, patientName)}>
                <Banknote className="h-4 w-4 mr-2 text-emerald-600" />
                Charge Sheet
              </DropdownMenuItem>
            )}
<DropdownMenuItem asChild>
               <Link href={`/doctor/consultations/${item.id}/edit`}>
                 <Pencil className="h-4 w-4 mr-2 text-slate-400" />
                 Edit Record
               </Link>
             </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={`/doctor/consultations/${item.id}`}>
                <Eye className="h-4 w-4 mr-2 text-slate-400" />
                View Record
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
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

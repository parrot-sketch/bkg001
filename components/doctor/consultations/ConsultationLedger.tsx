'use client';

import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ClipboardCheck, 
  Calendar, 
  Scissors, 
  Eye,
  Clock,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import Link from 'next/link';
import { 
  ConsultationOutcomeType, 
} from '@/domain/enums/ConsultationOutcomeType';

interface ConsultationLedgerProps {
  consultations: any[];
}

function OutcomeBadge({ outcomeType }: { outcomeType: string | null }) {
  if (!outcomeType) {
    return (
      <Badge variant="outline" className="text-[10px] font-semibold bg-amber-50 text-amber-700 border-amber-200">
        Pending
      </Badge>
    );
  }
  switch (outcomeType) {
    case ConsultationOutcomeType.PROCEDURE_RECOMMENDED:
      return <Badge variant="outline" className="text-[10px] font-semibold bg-orange-50 text-orange-700 border-orange-200">Surgery</Badge>;
    case ConsultationOutcomeType.FOLLOW_UP_CONSULTATION_NEEDED:
      return <Badge variant="outline" className="text-[10px] font-semibold bg-purple-50 text-purple-700 border-purple-200">Follow-up</Badge>;

    case ConsultationOutcomeType.CONSULTATION_ONLY:
      return <Badge variant="outline" className="text-[10px] font-semibold bg-slate-50 text-slate-600 border-slate-200">Consultation Only</Badge>;
    default:
      return <Badge variant="outline" className="text-[10px] font-semibold bg-slate-50 text-slate-500 border-slate-200">{outcomeType}</Badge>;
  }
}

export function ConsultationLedger({ consultations }: ConsultationLedgerProps) {
  if (consultations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 border border-border rounded-xl bg-card text-center">
        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
          <ClipboardCheck className="h-6 w-6 text-muted-foreground" />
        </div>
        <p className="text-sm font-semibold text-foreground mb-1">No completed consultations</p>
        <p className="text-xs text-muted-foreground max-w-xs">
          Sessions you finalize today will appear here with options to plan surgery or schedule follow-ups.
        </p>
      </div>
    );
  }

  return (
    <div className="border border-border rounded-xl overflow-hidden bg-card shadow-sm">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/40 hover:bg-muted/40">
            <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wide py-3">Patient</TableHead>
            <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wide py-3">Type</TableHead>
            <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wide py-3">Completed</TableHead>
            <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wide py-3">Outcome</TableHead>
            <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wide py-3 text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {consultations.map((item) => {
            const appointment = item.appointment;
            const patient = appointment?.patient;
            const firstName = patient?.first_name ?? patient?.firstName ?? '';
            const lastName = patient?.last_name ?? patient?.lastName ?? '';
            const patientName = patient ? `${firstName} ${lastName}`.trim() : 'Unknown Patient';
            const fileNumber = patient?.file_number ?? patient?.fileNumber;

            const completedAt = item.completed_at ?? item.completedAt;
            const completedAgo = completedAt
              ? formatDistanceToNow(new Date(completedAt), { addSuffix: true })
              : '—';
            const completedFormatted = completedAt
              ? format(new Date(completedAt), 'HH:mm')
              : '—';

            const outcomeType = item.outcome_type ?? item.outcomeType;

            return (
              <TableRow key={item.id} className="group hover:bg-muted/30 transition-colors border-border">

                {/* Patient */}
                <TableCell className="py-3.5">
                  <div>
                    <p className="text-sm font-semibold text-foreground leading-none mb-0.5 group-hover:text-primary transition-colors">
                      {patientName}
                    </p>
                    {fileNumber && (
                      <p className="text-xs text-muted-foreground">#{fileNumber}</p>
                    )}
                  </div>
                </TableCell>

                {/* Type */}
                <TableCell className="py-3.5">
                  <span className="text-sm text-muted-foreground">
                    {appointment?.type ?? 'Consultation'}
                  </span>
                </TableCell>

                {/* Completed */}
                <TableCell className="py-3.5">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Clock className="h-3.5 w-3.5 shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-foreground leading-none">{completedFormatted}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{completedAgo}</p>
                    </div>
                  </div>
                </TableCell>

                {/* Outcome */}
                <TableCell className="py-3.5">
                  <OutcomeBadge outcomeType={outcomeType} />
                </TableCell>

                {/* Actions */}
                <TableCell className="py-3.5 text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 px-2.5 text-[11px] font-semibold gap-1.5 border-slate-200 text-slate-600 hover:bg-orange-50 hover:text-orange-700 hover:border-orange-200 transition-colors"
                      onClick={async () => {
                        const { initiateSurgicalCase } = await import('@/actions/doctor/consultation-hub');
                        const res = await initiateSurgicalCase({ consultationId: item.id }) as { success: boolean; surgicalCaseId?: string };
                        if (res.success && res.surgicalCaseId) {
                          window.location.href = `/doctor/surgical-cases/${res.surgicalCaseId}/plan`;
                        }
                      }}
                    >
                      <Scissors className="h-3 w-3" />
                      Plan Surgery
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 px-2.5 text-[11px] font-semibold gap-1.5 border-slate-200 text-slate-600 hover:bg-purple-50 hover:text-purple-700 hover:border-purple-200 transition-colors"
                      asChild
                    >
                      <Link href={`/doctor/appointments/new?patientId=${patient?.id}&type=Follow-up&source=DOCTOR_FOLLOW_UP&parentConsultationId=${item.id}&parentAppointmentId=${appointment?.id}`}>
                        <Calendar className="h-3 w-3" />
                        Follow-up
                      </Link>
                    </Button>

                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 px-2.5 text-[11px] font-semibold gap-1.5 text-muted-foreground hover:text-foreground hover:bg-muted"
                      asChild
                    >
                      <Link href={`/doctor/consultations/${item.id}`}>
                        <Eye className="h-3 w-3" />
                        View
                      </Link>
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

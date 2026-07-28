'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { FileText, CalendarPlus, ChevronRight, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { AppointmentStatus } from '@/domain/enums/AppointmentStatus';
import type { AppointmentResponseDto } from '@/application/dtos/AppointmentResponseDto';

interface FrontdeskPendingActionsPanelProps {
  completedAppointments: AppointmentResponseDto[];
  isLoading?: boolean;
}

interface PendingAction {
  id: string;
  appointmentId: number;
  patientId: string;
  doctorId: string;
  patientName: string;
  patientFileNumber?: string;
  doctorName?: string;
  time?: string;
  followUpDate?: string;
  followUpType?: string;
  actions: Array<'chargesheet' | 'followup'>;
}

export function FrontdeskPendingActionsPanel({
  completedAppointments,
  isLoading,
}: FrontdeskPendingActionsPanelProps) {
  const router = useRouter();
  const [actioningId, setActioningId] = useState<number | null>(null);

  const pendingActions = useMemo((): PendingAction[] => {
    return completedAppointments
      .filter((apt) => apt.status === AppointmentStatus.COMPLETED)
      .map((apt) => {
        const patientName = apt.patient
          ? `${apt.patient.firstName} ${apt.patient.lastName}`
          : 'Unknown Patient';
        const doctorName = apt.doctor?.name || 'Unknown Doctor';

        const hasFollowUp = !!(apt as any).followUpDate;

        return {
          id: `pending-${apt.id}`,
          appointmentId: apt.id,
          patientId: apt.patientId,
          doctorId: apt.doctorId,
          patientName,
          patientFileNumber: apt.patient?.fileNumber || undefined,
          doctorName,
          time: apt.time,
          followUpDate: (apt as any).followUpDate,
          followUpType: (apt as any).followUpType,
          actions: hasFollowUp ? ['chargesheet'] as const : ['chargesheet', 'followup'] as const,
        };
      });
  }, [completedAppointments]);

  if (isLoading) {
    return (
      <Card className="border border-[#e7d6bf] bg-white shadow-sm">
        <CardHeader className="border-b border-[#e7d6bf] px-5 py-4">
          <CardTitle className="text-base font-semibold text-[#2c2e4b]">Post-Consultation Actions</CardTitle>
        </CardHeader>
        <CardContent className="p-4 space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="h-8 w-8 bg-[#e7d6bf]/50 rounded-lg animate-pulse" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-32 bg-[#e7d6bf]/50 rounded animate-pulse" />
                <div className="h-3 w-24 bg-[#e7d6bf]/50 rounded animate-pulse" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (pendingActions.length === 0) {
    return (
      <Card className="border border-[#e7d6bf] bg-white shadow-sm">
        <CardHeader className="border-b border-[#e7d6bf] px-5 py-4">
          <CardTitle className="text-base font-semibold text-[#2c2e4b]">Post-Consultation Actions</CardTitle>
        </CardHeader>
        <CardContent className="px-5 py-8 text-center">
          <p className="text-sm text-[#2c2e4b]/50">No pending actions</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border border-[#e7d6bf] bg-white shadow-sm">
      <CardHeader className="border-b border-[#e7d6bf] px-5 py-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold text-[#2c2e4b]">Post-Consultation Actions</CardTitle>
          <span className="text-xs text-[#2c2e4b]/60 font-medium">
            {pendingActions.length} pending
          </span>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-[#e7d6bf]">
          {pendingActions.map((action) => (
            <div key={action.id} className="px-5 py-3.5 hover:bg-[#e7d6bf]/10 transition-colors">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-10 text-center shrink-0">
                    <span className="text-sm font-semibold text-[#2c2e4b] leading-none tabular-nums">
                      {action.time || '--:--'}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-[#2c2e4b] truncate">{action.patientName}</p>
                      {action.patientFileNumber && (
                        <span className="text-[10px] text-[#2c2e4b]/50 font-mono shrink-0">
                          #{action.patientFileNumber}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-[#2c2e4b]/60 truncate">{action.doctorName || 'Unknown Doctor'}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {action.actions.includes('chargesheet') && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => router.push(`/frontdesk/appointments/${action.appointmentId}/billing`)}
                      disabled={actioningId === action.appointmentId}
                      className="h-8 px-2.5 text-[10px] rounded-lg border border-[#e7d6bf] text-[#2c2e4b] hover:bg-[#e7d6bf]/30"
                    >
                      {actioningId === action.appointmentId ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <FileText className="h-3.5 w-3.5 mr-1" />
                      )}
                      Charge Sheet
                    </Button>
                  )}
                  {action.actions.includes('followup') && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => router.push(`/frontdesk/appointments/${action.appointmentId}/followup?patientId=${action.patientId}&doctorId=${action.doctorId}`)}
                      disabled={actioningId === action.appointmentId}
                      className="h-8 px-2.5 text-[10px] rounded-lg border border-[#e7d6bf] text-[#2c2e4b] hover:bg-[#e7d6bf]/30"
                    >
                      {actioningId === action.appointmentId ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <CalendarPlus className="h-3.5 w-3.5 mr-1" />
                      )}
                      Follow-up
                    </Button>
                  )}
                  {action.followUpDate && (
                    <span className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-md font-medium">
                      Follow-up: {new Date(action.followUpDate).toLocaleDateString()}
                      {action.followUpType && ` • ${action.followUpType}`}
                    </span>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => router.push(`/frontdesk/appointments/${action.appointmentId}`)}
                    className="h-8 w-8 p-0 rounded-lg text-[#2c2e4b]/40 hover:text-[#2c2e4b] hover:bg-[#e7d6bf]/30"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}


import { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, UserPlus } from 'lucide-react';
import type { AppointmentResponseDto } from '@/application/dtos/AppointmentResponseDto';

interface ArrivingTodaySectionProps {
  appointments: AppointmentResponseDto[];
  loading: boolean;
  onCheckIn: (appointmentId: number) => void;
  actionLoading?: string | null;
}

export function ArrivingTodaySection({ appointments, loading, onCheckIn, actionLoading }: ArrivingTodaySectionProps) {
  if (appointments.length === 0) return null;

  return (
    <Card className="border border-[#e7d6bf] bg-white">
      <div className="px-4 py-3 border-b border-[#e7d6bf] flex items-center justify-between">
        <div className="text-sm font-semibold text-[#2c2e4b] flex items-center gap-2">
          <div className="h-8 w-8 border border-[#e7d6bf] bg-[#caa26a]/10 flex items-center justify-center">
            <UserPlus className="h-4 w-4 text-[#caa26a]" />
          </div>
          Arriving Today — Check In
        </div>
        <Badge variant="outline" className="rounded-none text-xs border-[#e7d6bf] text-[#2c2e4b] font-semibold">
          {loading ? '…' : appointments.length}
        </Badge>
      </div>
      <div className="p-0">
        {loading ? (
          <div className="p-4 flex justify-center">
            <Loader2 className="h-4 w-4 animate-spin text-[#caa26a]" />
          </div>
        ) : (
          <div className="divide-y divide-[#e7d6bf]/60">
            {appointments.map((appointment) => {
              const patientName = appointment.patient
                ? `${appointment.patient.firstName} ${appointment.patient.lastName}`
                : 'Unknown Patient';
              const isLoading = actionLoading === `checkin-${appointment.id}`;

              return (
                <div key={appointment.id} className="px-4 py-3 hover:bg-[#e7d6bf]/10 transition-colors">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-[#2c2e4b] truncate">{patientName}</p>
                        {appointment.patient?.fileNumber && (
                          <span className="text-[10px] text-[#2c2e4b]/50 font-mono shrink-0">
                            #{appointment.patient.fileNumber}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-[#2c2e4b]/60">{appointment.type || 'Consultation'}</span>
                        <span className="text-[#e7d6bf]">•</span>
                        <span className="text-xs text-[#2c2e4b]/60">
                          {appointment.time || '--:--'}
                        </span>
                        {appointment.doctor?.name && (
                          <>
                            <span className="text-[#e7d6bf]">•</span>
                            <span className="text-xs text-[#2c2e4b]/60 truncate">{appointment.doctor.name}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        size="sm"
                        onClick={() => onCheckIn(appointment.id)}
                        disabled={isLoading}
                        className="h-8 px-3 text-xs bg-[#caa26a] hover:bg-[#b8913e] text-[#2c2e4b] rounded-lg font-medium"
                      >
                        {isLoading ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <>
                            <UserPlus className="h-3.5 w-3.5 mr-1.5" />
                            Check In
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Card>
  );
}

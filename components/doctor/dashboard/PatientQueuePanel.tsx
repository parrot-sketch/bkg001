'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Loader2, Stethoscope } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useDoctorQueue } from '@/hooks/use-doctor-dashboard';
import { useStartConsultation } from '@/hooks/doctor/useConsultation';

type QueueItem = NonNullable<ReturnType<typeof useDoctorQueue>[number]>;

function formatQueueStatus(item: QueueItem): string {
  const aptStatus = String(item.appointmentStatus ?? '').toUpperCase();
  if (aptStatus === 'READY_FOR_CONSULTATION') return 'Ready';
  if (aptStatus === 'CHECKED_IN') return 'Checked in';
  if (item.isWalkIn) return 'Walk-in';
  return 'Waiting';
}

const STATUS_CONFIG: Record<string, { bg: string; text: string }> = {
  ready: { bg: 'bg-[#caa26a]/20', text: 'text-[#2c2e4b]' },
  'checked in': { bg: 'bg-[#caa26a]/20', text: 'text-[#2c2e4b]' },
  'walk-in': { bg: 'bg-[#caa26a]/20', text: 'text-[#2c2e4b]' },
};

function getStatusConfig(status: string) {
  return STATUS_CONFIG[status.toLowerCase()] ?? { bg: 'bg-[#caa26a]/20', text: 'text-[#2c2e4b]' };
}

export function PatientQueuePanel() {
  const queue = useDoctorQueue();
  const router = useRouter();
  const { mutate: startConsultation } = useStartConsultation();
  const [pendingAppointmentId, setPendingAppointmentId] = useState<number | null>(null);

  const handleStart = (apt: QueueItem) => {
    const appointmentId = apt.appointmentId;
    if (!appointmentId) {
      toast.error('Unable to start consultation: missing appointment');
      return;
    }

    setPendingAppointmentId(appointmentId);

    startConsultation(appointmentId, {
      onSuccess: () => {
        router.push(`/doctor/consultations/session/${appointmentId}`);
      },
      onSettled: () => {
        setPendingAppointmentId((current) => (current === appointmentId ? null : current));
      },
    });
  };

  return (
    <Card className="border border-[#e7d6bf] bg-white shadow-sm">
      <CardHeader className="border-b border-[#e7d6bf] px-5 py-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold text-[#2c2e4b]">Patient Queue</CardTitle>
          <span className="text-xs text-[#2c2e4b]/60 font-medium">
            {queue.length === 0 ? 'No patients waiting' : `${queue.length} waiting`}
          </span>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {queue.length === 0 ? (
          <div className="px-5 py-12 text-center text-sm text-[#2c2e4b]/60">No patients waiting</div>
        ) : (
          <div className="divide-y divide-[#e7d6bf]">
            {queue.map((item, index) => {
              const status = formatQueueStatus(item);
              const statusConfig = getStatusConfig(status);
              const isLoading = pendingAppointmentId === item.appointmentId;

              return (
                <div
                  key={item.id}
                  className="px-5 py-3.5 hover:bg-[#e7d6bf]/10 transition-colors"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <span className="text-xs font-medium text-[#2c2e4b]/50 w-4 shrink-0">{index + 1}</span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-[#2c2e4b] truncate">{item.patientName}</p>
                          <span className="text-[10px] text-[#2c2e4b]/50 font-mono shrink-0">{item.patientFileNumber}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-[#2c2e4b]/60">{item.type}</span>
                          <span className="text-[#e7d6bf]">.</span>
                          <span className="text-xs text-[#2c2e4b]/60">Wait: <span className="text-[#caa26a] font-medium">{item.waitTime}</span></span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant="outline" className={`text-[10px] font-medium border-0 ${statusConfig.bg} ${statusConfig.text}`}>
                        {status}
                      </Badge>
                      <Button
                        size="sm"
                        onClick={() => handleStart(item)}
                        disabled={isLoading}
                        className="h-8 px-3 text-xs bg-[#2c2e4b] hover:bg-[#1a1c2f] text-white"
                      >
                        {isLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Stethoscope className="h-3 w-3 mr-1" />}
                        Consult
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

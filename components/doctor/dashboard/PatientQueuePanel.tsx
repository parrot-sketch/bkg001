'use client';

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
  ready: { bg: 'bg-[#0c5d69]', text: 'text-white' },
  'checked in': { bg: 'bg-[#e6f0f1]', text: 'text-[#0c5d69]' },
  'walk-in': { bg: 'bg-[#fdf6e3]', text: 'text-[#78350f]' },
};

function getStatusConfig(status: string) {
  return STATUS_CONFIG[status.toLowerCase()] ?? { bg: 'bg-slate-100', text: 'text-slate-600' };
}

export function PatientQueuePanel() {
  const queue = useDoctorQueue();
  const router = useRouter();
  const { mutate: startConsultation, isPending } = useStartConsultation();

  const handleStart = (apt: QueueItem) => {
    const appointmentId = apt.appointmentId;
    if (!appointmentId) {
      toast.error('Unable to start consultation: missing appointment');
      return;
    }

    startConsultation(appointmentId, {
      onSuccess: () => {
        router.push(`/doctor/consultations/session/${appointmentId}`);
      },
    });
  };

  return (
    <Card className="border border-slate-200 shadow-sm">
      <CardHeader className="border-b border-slate-100 px-5 py-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold text-[#121c1d]">Patient Queue</CardTitle>
          <span className="text-xs text-slate-400 font-medium">
            {queue.length === 0 ? 'No patients waiting' : `${queue.length} waiting`}
          </span>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {queue.length === 0 ? (
          <div className="px-5 py-12 text-center text-sm text-slate-400">No patients waiting</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {queue.map((item, index) => {
              const status = formatQueueStatus(item);
              const statusConfig = getStatusConfig(status);

              return (
                <div
                  key={item.id}
                  className="px-5 py-3.5 hover:bg-slate-50/50 transition-colors"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <span className="text-xs font-medium text-slate-400 w-4 shrink-0">{index + 1}</span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-[#121c1d] truncate">{item.patientName}</p>
                          <span className="text-[10px] text-slate-400 font-mono shrink-0">{item.patientFileNumber}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-slate-400">{item.type}</span>
                          <span className="text-slate-200">.</span>
                          <span className="text-xs text-slate-400">Wait: <span className="text-[#0c5d69] font-medium">{item.waitTime}</span></span>
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
                        disabled={isPending}
                        className="h-8 px-3 text-xs rounded-lg bg-[#0c5d69] hover:bg-[#0a4f59] text-white"
                      >
                        {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Stethoscope className="h-3 w-3 mr-1" />}
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

'use client';

import { useDoctorQueue } from '@/hooks/use-doctor-dashboard';
import { useStartConsultation } from '@/hooks/doctor/useConsultation';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

function formatQueueStatus(item: any): string {
  const aptStatus = String(item.appointmentStatus ?? '').toUpperCase();
  if (aptStatus === 'READY_FOR_CONSULTATION') return 'Ready';
  if (aptStatus === 'CHECKED_IN') return 'Checked in';
  if (item.isWalkIn) return 'Walk-in';
  return 'Waiting';
}

export function PatientQueuePanel() {
  const queue = useDoctorQueue();
  const router = useRouter();
  const { mutate: startConsultation, isPending } = useStartConsultation();

  const handleStart = (apt: any) => {
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
    <section className="border border-slate-200 bg-white">
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
        <h2 className="text-sm font-semibold text-slate-900">Patient queue</h2>
        <div className="text-xs text-slate-500">
          {queue.length === 0 ? 'No patients waiting' : `${queue.length} waiting`}
        </div>
      </div>

      {queue.length > 0 && (
        <div className="hidden md:grid grid-cols-12 gap-4 px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500 border-b border-slate-200">
          <div className="col-span-1">#</div>
          <div className="col-span-4">Patient</div>
          <div className="col-span-2">File</div>
          <div className="col-span-2">Visit</div>
          <div className="col-span-1">Wait</div>
          <div className="col-span-1">Status</div>
          <div className="col-span-1 text-right">Consult</div>
        </div>
      )}

      {queue.length === 0 ? (
        <div className="px-4 py-10 text-center text-sm text-slate-500">No patients waiting</div>
      ) : (
        <div className="divide-y divide-slate-200">
          {queue.map((item: any, index: number) => (
            <div
              key={item.id}
              className="px-4 py-3 hover:bg-slate-50 transition-colors md:grid md:grid-cols-12 md:gap-4 md:items-center"
            >
              <div className="hidden md:block md:col-span-1 text-xs text-slate-500">{index + 1}</div>

              <div className="md:col-span-4 min-w-0">
                <div className="text-sm font-medium text-slate-900 truncate">{item.patientName}</div>
                <div className="md:hidden text-xs text-slate-500 mt-0.5">
                  {item.patientFileNumber} • {item.type} • {item.waitTime} • {formatQueueStatus(item)}
                </div>
              </div>

              <div className="hidden md:block md:col-span-2 text-sm text-slate-700">{item.patientFileNumber}</div>
              <div className="hidden md:block md:col-span-2 text-sm text-slate-700">{item.type}</div>
              <div className="hidden md:block md:col-span-1 text-sm text-slate-700">{item.waitTime}</div>
              <div className="hidden md:block md:col-span-1 text-sm text-slate-700">{formatQueueStatus(item)}</div>

              <div className="mt-3 md:mt-0 md:col-span-1 md:flex md:justify-end">
                <Button
                  size="sm"
                  onClick={() => handleStart(item)}
                  disabled={isPending}
                  variant="outline"
                  className="h-8 px-3 text-xs rounded-none"
                >
                  {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Consult'}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

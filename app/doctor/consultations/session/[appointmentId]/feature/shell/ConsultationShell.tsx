'use client';

import { ReactNode, Suspense } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import dynamic from 'next/dynamic';

const ConsultationQueuePanel = dynamic(
  () => import('@/components/consultation/ConsultationQueuePanel').then(mod => ({
    default: mod.ConsultationQueuePanel,
  })),
  { ssr: false }
);

interface ConsultationShellProps {
  type: 'loading' | 'error' | 'queue' | 'active';
  children?: ReactNode;
  error?: string;
  onRetry?: () => void;
  waitingQueue?: any[];
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export function ConsultationShell({
  type,
  children,
  error,
  onRetry,
  waitingQueue = [],
  onRefresh,
  isRefreshing,
}: ConsultationShellProps) {
  if (type === 'loading') {
    return (
      <div className="flex h-screen items-center justify-center bg-white">
        <div className="text-center space-y-4">
          <div className="relative">
            <div className="h-14 w-14 rounded-2xl bg-white border border-[#e7d6bf] flex items-center justify-center mx-auto">
              <Loader2 className="h-7 w-7 animate-spin text-[#caa26a]" />
            </div>
          </div>
          <div>
            <p className="text-sm font-medium text-[#2c2e4b]">Loading Consultation Room…</p>
            <p className="text-xs text-[#2c2e4b]/60 mt-1">Preparing your workspace</p>
          </div>
        </div>
      </div>
    );
  }

  if (type === 'error') {
    return (
      <div className="flex h-screen items-center justify-center bg-white">
        <div className="text-center space-y-4 max-w-md px-6">
          <div className="border border-[#e7d6bf] bg-white p-6">
            <h2 className="text-base font-semibold text-[#2c2e4b]">Unable to load consultation</h2>
            <p className="text-sm text-[#2c2e4b]/70 leading-relaxed">{error}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={onRetry}
              className="mt-4 rounded-lg border-[#e7d6bf] text-[#2c2e4b]"
            >
              Try again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (type === 'queue') {
    return (
      <div className="flex h-screen">
        <div className="flex-1">
          <QueueEmptyState
            waitingQueue={waitingQueue}
            onRefresh={onRefresh}
            isRefreshing={isRefreshing}
          />
        </div>
        <Suspense fallback={null}>
          <ConsultationQueuePanel
            currentAppointmentId={undefined}
            currentPatientName="Unknown Patient"
            currentAppointmentStatus={undefined}
            doctorId={undefined}
            appointments={waitingQueue}
            onSwitchPatient={() => {}}
            onSaveDraft={() => Promise.resolve()}
            hasDrafts={false}
            onRefresh={onRefresh}
            isRefreshing={isRefreshing}
            defaultCollapsed={false}
          />
        </Suspense>
      </div>
    );
  }

  return <>{children}</>;
}

function QueueEmptyState({ waitingQueue, onRefresh, isRefreshing }: {
  waitingQueue: any[];
  onRefresh?: () => void;
  isRefreshing?: boolean;
}) {
  return (
    <div className="flex flex-col h-screen bg-white">
      <div className="h-16 border-b border-[#e7d6bf] flex items-center justify-center px-4 bg-white">
        <h1 className="text-base font-semibold text-[#2c2e4b]">Consultation room</h1>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <div className="text-center max-w-sm border border-[#e7d6bf] bg-white p-8 rounded-xl shadow-sm">
          <h2 className="text-base font-semibold text-[#2c2e4b] mb-2">Waiting for patient</h2>
          <p className="text-sm text-[#2c2e4b]/70 mb-4">
            {waitingQueue.length > 0
              ? `${waitingQueue.length} patient${waitingQueue.length > 1 ? 's' : ''} waiting in queue`
              : 'No patients currently in queue'
            }
          </p>
        </div>
      </div>
    </div>
  );
}

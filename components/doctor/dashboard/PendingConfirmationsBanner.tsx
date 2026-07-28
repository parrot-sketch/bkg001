'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';

interface PendingConfirmationsBannerProps {
  pendingCount: number;
  pendingAppointmentIds?: number[];
}

export function PendingConfirmationsBanner({ pendingCount, pendingAppointmentIds = [] }: PendingConfirmationsBannerProps) {
  if (pendingCount === 0) return null;

  const router = useRouter();
  const hasSingle = pendingAppointmentIds.length === 1;
  const href = hasSingle ? `/doctor/appointments/${pendingAppointmentIds[0]}` : '/doctor/appointments?status=PENDING_DOCTOR_CONFIRMATION';

  const handleClick = (e: React.MouseEvent) => {
    if (hasSingle) {
      e.preventDefault();
      router.push(href);
    }
  };

  return (
    <Link href={href} onClick={handleClick} className="block">
      <div className="p-4 bg-[#e7d6bf] border border-[#caa26a]/30 rounded-xl hover:bg-[#e7d6bf]/80 transition-colors cursor-pointer">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-[#caa26a]/20 flex items-center justify-center shrink-0">
            <span className="text-[#2c2e4b] text-sm font-bold">!</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-[#2c2e4b]">
              {pendingCount} appointment{pendingCount > 1 ? 's' : ''} awaiting confirmation
            </p>
            {!hasSingle && pendingAppointmentIds.length > 0 && (
              <p className="text-[11px] text-[#2c2e4b]/60 mt-0.5">
                Click to view and confirm pending appointments
              </p>
            )}
            {hasSingle && (
              <p className="text-[11px] text-[#2c2e4b]/60 mt-0.5">
                Click to review and confirm this appointment
              </p>
            )}
          </div>
          <span className="text-xs text-[#2c2e4b] font-medium shrink-0">Review Now →</span>
        </div>
      </div>
    </Link>
  );
}

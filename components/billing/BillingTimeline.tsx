'use client';

import { formatDistanceToNow } from 'date-fns';
import { PaymentStatus } from '@/domain/enums/PaymentStatus';
import type { PaymentWithRelations } from '@/domain/interfaces/repositories/IPaymentRepository';

interface BillingTimelineProps {
  payment: PaymentWithRelations;
}

export function BillingTimeline({ payment }: BillingTimelineProps) {
  return (
    <div className="border border-[#e7d6bf] bg-white">
      <div className="px-4 py-3 border-b border-[#e7d6bf]">
        <div className="text-sm font-semibold text-[#2c2e4b] flex items-center gap-2">
          <ActivityIcon className="h-4 w-4 text-[#caa26a]" />
          Timeline
        </div>
      </div>
      <div className="p-4">
        <div className="space-y-0">
          <TimelineItem label="Bill created" time={payment.billDate} done />
{payment.finalizedAt && (
             <TimelineItem label="Charge sheet finalized" time={payment.finalizedAt} done />
           )}
           {payment.amountPaid > 0 && (
             <TimelineItem label="Payment recorded" time={payment.paymentDate || payment.billDate} done />
           )}
           {payment.status === PaymentStatus.PAID && (
             <TimelineItem label="Payment completed" time={payment.paymentDate || payment.billDate} done />
           )}
           {payment.status === PaymentStatus.UNPAID && !payment.finalizedAt && (
             <TimelineItem label="Awaiting finalization" active />
           )}
          {payment.status === PaymentStatus.PART && (
            <TimelineItem label="Balance remains" active />
          )}
        </div>
      </div>
    </div>
  );
}

function TimelineItem({
  label,
  time,
  done,
  active,
}: {
  label: string;
  time?: Date | string;
  done?: boolean;
  active?: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex flex-col items-center gap-1.5 min-w-[24px]">
        <div
          className={[
            'h-2 w-2 rounded-full',
            done ? 'bg-[#2c2e4b]' : active ? 'bg-[#caa26a]' : 'bg-[#e7d6bf]',
          ].join(' ')}
        />
      </div>
      <div className="flex-1 min-w-0">
        <p
          className={[
            'text-xs font-medium',
            done ? 'text-[#2c2e4b]' : active ? 'text-[#caa26a]' : 'text-[#2c2e4b]/50',
          ].join(' ')}
        >
          {label}
        </p>
        {time && (
          <p className="text-[10px] text-[#2c2e4b]/50">
            {formatDistanceToNow(new Date(time), { addSuffix: true })}
          </p>
        )}
      </div>
    </div>
  );
}

function ActivityIcon({ className }: { className?: string }) {
  return <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" /></svg>;
}

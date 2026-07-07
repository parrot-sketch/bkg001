'use client';

import { DetailRow } from '@/components/doctor/appointments/DetailRow';
import { format } from 'date-fns';
import type { PaymentWithRelations } from '@/domain/interfaces/repositories/IPaymentRepository';

interface BillingDetailsCardProps {
  payment: PaymentWithRelations;
}

export function BillingDetailsCard({ payment }: BillingDetailsCardProps) {
  return (
    <div className="border border-[#e7d6bf] bg-white">
      <div className="px-4 py-3 border-b border-[#e7d6bf]">
        <div className="text-sm font-semibold text-[#2c2e4b] flex items-center gap-2">
          <CalendarClockIcon className="h-4 w-4 text-[#caa26a]" />
          Bill Details
        </div>
      </div>
      <div className="p-4 space-y-4">
        <DetailRow
          icon={CalendarIcon}
          label="Bill Date"
          value={format(new Date(payment.billDate), 'EEEE, MMMM d, yyyy')}
        />
        {payment.paymentDate && (
          <DetailRow
            icon={CheckCircleIcon}
            label="Paid On"
            value={format(new Date(payment.paymentDate), 'EEEE, MMMM d, yyyy')}
          />
        )}
        <DetailRow
          icon={ReceiptIcon}
          label="Charge Sheet"
          value={payment.chargeSheetNo || 'Not assigned'}
        />
        <DetailRow
          icon={DollarIcon}
          label="Total Amount"
          value={`KES ${payment.totalAmount.toLocaleString()}`}
        />
        {payment.discount > 0 && (
          <DetailRow
            icon={TagIcon}
            label="Discount"
            value={`KES ${payment.discount.toLocaleString()}`}
          />
        )}
        {payment.amountPaid > 0 && (
          <DetailRow
            icon={CheckCircleIcon}
            label="Amount Paid"
            value={`KES ${payment.amountPaid.toLocaleString()}`}
          />
        )}
      </div>
    </div>
  );
}

function CalendarIcon({ className }: { className?: string }) {
  return <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" /></svg>;
}
function CheckCircleIcon({ className }: { className?: string }) {
  return <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
}
function ReceiptIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
    </svg>
  );
}
function DollarIcon({ className }: { className?: string }) {
  return <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.5-2.303 1.5-3.659 0-1.356-.328-2.78-.879-3.659-.879-1.172-2.303-1.5-3.659-1.5-.879 0-1.772.328-2.303.879M15 9.75h.007v.008H15v-.008z" /></svg>;
}
function TagIcon({ className }: { className?: string }) {
  return <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.782.782 2.045.782 2.827 0l4.268-4.268c.782-.782.782-2.045 0-2.827L12.42 3.659A2.25 2.25 0 0010.828 3H9.568z" /></svg>;
}
function CalendarClockIcon({ className }: { className?: string }) {
  return <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" /></svg>;
}

'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { AlertCircle, ArrowRight, Loader2, Receipt } from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import { cn } from '@/lib/utils';

interface PatientPayment {
  id: number;
  appointmentId: number | null;
  billType: string;
  billDate: string;
  discount: number;
  totalAmount: number;
  amountPaid: number;
  status: 'PAID' | 'PART' | 'UNPAID';
  receiptNumber: string | null;
  chargeSheetNo?: string;
}

const STATUS_STYLES: Record<PatientPayment['status'], { label: string; className: string }> = {
  PAID: { label: 'Paid', className: 'border-emerald-200 bg-emerald-50 text-emerald-700' },
  PART: { label: 'Part paid', className: 'border-amber-200 bg-amber-50 text-amber-800' },
  UNPAID: { label: 'Unpaid', className: 'border-red-200 bg-red-50 text-red-700' },
};

const kes = (amount: number) => `KES ${Math.max(0, amount).toLocaleString('en-KE')}`;
const humanize = (value: string) => value.replace(/_/g, ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase());

export function FrontdeskPatientBilling({ patientId }: { patientId: string }) {
  const { data: payments = [], isLoading, isError } = useQuery<PatientPayment[]>({
    queryKey: ['payments', 'patient', patientId],
    queryFn: async () => {
      const response = await apiClient.get<PatientPayment[]>(`/payments/patient/${patientId}`);
      if (!response.success) throw new Error(response.error || 'Failed to load billing');
      return response.data || [];
    },
    staleTime: 60_000,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-xl border border-[#e7d6bf] bg-white/95 py-16 text-sm text-[#2c2e4b]/60">
        <Loader2 className="h-4 w-4 animate-spin text-[#caa26a]" />
        Loading billing…
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-xl border border-[#e7d6bf] bg-white/95 py-16 text-center">
        <AlertCircle className="h-6 w-6 text-red-400" />
        <p className="text-sm text-[#2c2e4b]/70">Billing could not be loaded. Refresh the page to try again.</p>
      </div>
    );
  }

  const payable = (p: PatientPayment) => p.totalAmount - (p.discount || 0);
  const totalBilled = payments.reduce((sum, p) => sum + payable(p), 0);
  const totalPaid = payments.reduce((sum, p) => sum + (p.amountPaid || 0), 0);
  const balance = totalBilled - totalPaid;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {[
          { label: 'Total billed', value: kes(totalBilled) },
          { label: 'Paid', value: kes(totalPaid) },
          { label: 'Balance due', value: kes(balance), emphasise: balance > 0 },
        ].map((tile) => (
          <div
            key={tile.label}
            className={cn(
              'rounded-xl border bg-white/95 px-4 py-3',
              tile.emphasise ? 'border-[#caa26a] bg-[#caa26a]/5' : 'border-[#e7d6bf]',
            )}
          >
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#2c2e4b]/50">{tile.label}</p>
            <p className="mt-1 font-mono text-lg font-semibold text-[#2c2e4b]">{tile.value}</p>
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-xl border border-[#e7d6bf] bg-white/95">
        <header className="flex items-center justify-between border-b border-[#e7d6bf]/70 px-5 py-3">
          <div className="flex items-center gap-2">
            <Receipt className="h-4 w-4 text-[#caa26a]" />
            <h2 className="text-sm font-semibold text-[#2c2e4b]">Bills</h2>
          </div>
          {balance > 0 && (
            <Link href="/frontdesk/billing" className="text-xs font-medium text-[#2c2e4b] hover:underline">
              Go to billing desk
            </Link>
          )}
        </header>

        {payments.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <p className="text-sm font-medium text-[#2c2e4b]">No bills yet</p>
            <p className="mt-1 text-xs text-[#2c2e4b]/50">Bills appear here once the patient has been seen by a doctor.</p>
          </div>
        ) : (
          <ul className="divide-y divide-[#e7d6bf]/60">
            {payments.map((p) => {
              const status = STATUS_STYLES[p.status] ?? STATUS_STYLES.UNPAID;
              const due = payable(p) - (p.amountPaid || 0);
              const row = (
                <div className="flex items-center gap-4 px-5 py-3.5">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-[#2c2e4b]">
                      {humanize(p.billType)}
                      {p.chargeSheetNo && <span className="ml-2 font-mono text-xs text-[#2c2e4b]/50">{p.chargeSheetNo}</span>}
                    </p>
                    <p className="mt-0.5 text-xs text-[#2c2e4b]/55">
                      {format(new Date(p.billDate), 'd MMM yyyy')}
                      {p.receiptNumber ? ` · Receipt ${p.receiptNumber}` : ''}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-sm font-semibold text-[#2c2e4b]">{kes(payable(p))}</p>
                    {due > 0 && <p className="font-mono text-[11px] text-red-700">{kes(due)} due</p>}
                  </div>
                  <span className={cn('rounded-full border px-2.5 py-1 text-[11px] font-medium', status.className)}>
                    {status.label}
                  </span>
                  {p.appointmentId && <ArrowRight className="h-3.5 w-3.5 text-[#2c2e4b]/25" />}
                </div>
              );
              return (
                <li key={p.id}>
                  {p.appointmentId ? (
                    <Link
                      href={`/frontdesk/appointments/${p.appointmentId}/billing`}
                      className="block transition-colors hover:bg-[#e7d6bf]/15"
                    >
                      {row}
                    </Link>
                  ) : (
                    row
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Loader2 } from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import { frontdeskChargeSheetPath } from '@/hooks/frontdesk/useBookAppointmentStore';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

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

const STATUS_LABEL: Record<PatientPayment['status'], { label: string; className: string }> = {
  PAID: { label: 'Paid', className: 'text-[#005f73]' },
  PART: { label: 'Part paid', className: 'text-[#b8913e]' },
  UNPAID: { label: 'Unpaid', className: 'text-[#9b2226]' },
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
      <div className="flex items-center justify-center gap-2 px-5 py-16 text-sm text-[#2c2e4b]/60">
        <Loader2 className="h-4 w-4 animate-spin text-[#caa26a]" />
        Loading billing…
      </div>
    );
  }

  if (isError) {
    return (
      <div className="px-5 py-16">
        <p className="text-sm text-[#2c2e4b]/70">Billing could not be loaded. Refresh the page to try again.</p>
      </div>
    );
  }

  const payable = (p: PatientPayment) => p.totalAmount - (p.discount || 0);
  const totalBilled = payments.reduce((sum, p) => sum + payable(p), 0);
  const totalPaid = payments.reduce((sum, p) => sum + (p.amountPaid || 0), 0);
  const balance = totalBilled - totalPaid;

  const totals = [
    { label: 'Total billed', value: kes(totalBilled) },
    { label: 'Paid', value: kes(totalPaid) },
    { label: 'Balance due', value: kes(balance) },
  ];

  return (
    <div>
      <dl className="grid grid-cols-1 gap-px bg-[#e7d6bf] sm:grid-cols-3">
        {totals.map((tile) => (
          <div key={tile.label} className="bg-[#e7d6bf]/30 px-5 py-4">
            <dt className="text-[11px] font-semibold uppercase tracking-wider text-[#005f73]">{tile.label}</dt>
            <dd className="mt-1 font-mono text-base font-semibold text-[#2c2e4b]">{tile.value}</dd>
          </div>
        ))}
      </dl>

      <div className="flex items-center justify-between border-b-2 border-[#2c2e4b] bg-[#e7d6bf]/30 px-5 py-2.5">
        <h2 className="text-sm font-semibold text-[#2c2e4b]">Bills</h2>
        {balance > 0 && (
          <Link href="/frontdesk/billing" className="text-xs font-medium text-[#2c2e4b] hover:underline">
            Billing desk
          </Link>
        )}
      </div>

      {payments.length === 0 ? (
        <div className="px-5 py-10">
          <p className="text-sm font-medium text-[#2c2e4b]">No bills yet</p>
          <p className="mt-1 text-sm text-[#2c2e4b]/55">Bills appear here once the patient has been seen by a doctor.</p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow className="border-[#e7d6bf] hover:bg-transparent">
              {['Date', 'Bill', 'Receipt', 'Amount', 'Due', 'Status'].map((column) => (
                <TableHead key={column} className="h-9 bg-[#e7d6bf]/30 px-5 text-[11px] font-semibold uppercase tracking-wider text-[#005f73]">
                  {column}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {payments.map((p) => {
              const status = STATUS_LABEL[p.status] ?? STATUS_LABEL.UNPAID;
              const due = payable(p) - (p.amountPaid || 0);
              const date = format(new Date(p.billDate), 'd MMM yyyy');
              return (
                <TableRow key={p.id} className="border-[#e7d6bf] hover:bg-[#e7d6bf]/30">
                  <TableCell className="px-5 py-2.5 tabular-nums text-[#2c2e4b]">
                    {p.appointmentId ? (
                      <Link href={frontdeskChargeSheetPath(patientId, p.appointmentId)} className="font-medium hover:underline">
                        {date}
                      </Link>
                    ) : date}
                  </TableCell>
                  <TableCell className="px-5 py-2.5 text-[#2c2e4b]">
                    {humanize(p.billType)}
                    {p.chargeSheetNo ? <span className="ml-2 font-mono text-xs text-[#2c2e4b]/50">{p.chargeSheetNo}</span> : null}
                  </TableCell>
                  <TableCell className="px-5 py-2.5 font-mono text-xs text-[#2c2e4b]">{p.receiptNumber || '—'}</TableCell>
                  <TableCell className="px-5 py-2.5 font-mono text-[#2c2e4b]">{kes(payable(p))}</TableCell>
                  <TableCell className={`px-5 py-2.5 font-mono ${due > 0 ? 'text-[#9b2226]' : 'text-[#2c2e4b]'}`}>
                    {due > 0 ? kes(due) : '—'}
                  </TableCell>
                  <TableCell className={`px-5 py-2.5 text-sm font-medium ${status.className}`}>{status.label}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </div>
  );
}

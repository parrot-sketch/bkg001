'use client';

import { memo } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { CreditCard, ChevronRight } from 'lucide-react';
import { PaymentStatus, getPaymentStatusLabel } from '@/domain/enums/PaymentStatus';
import { cn } from '@/lib/utils';
import type { PaymentWithRelations } from '@/domain/interfaces/repositories/IPaymentRepository';

interface BillingPaymentTableProps {
  payments: PaymentWithRelations[];
  onCollectPayment: (payment: PaymentWithRelations) => void;
  onViewPatient: (patientId: string) => void;
}

export const BillingPaymentTable = memo(function BillingPaymentTable({
  payments,
  onCollectPayment,
  onViewPatient,
}: BillingPaymentTableProps) {
  if (payments.length === 0) {
    return null;
  }

  return (
    <div className="border border-[#e7d6bf] bg-white rounded-xl overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="border-b border-[#e7d6bf] bg-[#e7d6bf]/10 hover:bg-[#e7d6bf]/10">
            <TableHead className="text-xs font-semibold text-[#2c2e4b]/70 uppercase tracking-wider px-4">Patient</TableHead>
            <TableHead className="text-xs font-semibold text-[#2c2e4b]/70 uppercase tracking-wider">Charge Sheet</TableHead>
            <TableHead className="text-xs font-semibold text-[#2c2e4b]/70 uppercase tracking-wider">Bill Date</TableHead>
            <TableHead className="text-xs font-semibold text-[#2c2e4b]/70 uppercase tracking-wider text-right">Total</TableHead>
            <TableHead className="text-xs font-semibold text-[#2c2e4b]/70 uppercase tracking-wider text-right">Paid</TableHead>
            <TableHead className="text-xs font-semibold text-[#2c2e4b]/70 uppercase tracking-wider text-right">Balance</TableHead>
            <TableHead className="text-xs font-semibold text-[#2c2e4b]/70 uppercase tracking-wider">Status</TableHead>
            <TableHead className="text-xs font-semibold text-[#2c2e4b]/70 uppercase tracking-wider w-20"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {payments.map((payment) => {
            const remaining = payment.totalAmount - payment.discount - payment.amountPaid;
            const isPaid = payment.status === PaymentStatus.PAID;
            return (
              <TableRow key={payment.id} className="border-b border-[#e7d6bf] last:border-0 hover:bg-[#e7d6bf]/10">
                <TableCell className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-[#e7d6bf]/30 flex items-center justify-center flex-shrink-0">
                      <ReceiptIcon className="h-4 w-4 text-[#caa26a]" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-[#2c2e4b] text-sm truncate">
                        {payment.patient?.firstName} {payment.patient?.lastName}
                      </p>
                      {payment.patient?.fileNumber && (
                        <p className="text-[10px] text-[#2c2e4b]/50 font-mono">#{payment.patient.fileNumber}</p>
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell className="py-3">
                  {payment.chargeSheetNo ? (
                    <code className="text-[10px] bg-[#e7d6bf]/30 text-[#2c2e4b] px-1.5 py-0.5 rounded border border-[#e7d6bf]">
                      {payment.chargeSheetNo}
                    </code>
                  ) : (
                    <span className="text-[#2c2e4b]/40 text-xs">-</span>
                  )}
                </TableCell>
                <TableCell className="py-3">
                  <span className="text-sm text-[#2c2e4b]">
                    {format(new Date(payment.billDate), 'MMM dd, yyyy')}
                  </span>
                </TableCell>
                <TableCell className="py-3 text-right">
                  <span className="text-sm font-medium text-[#2c2e4b]">
                    KES {payment.totalAmount.toLocaleString()}
                  </span>
                </TableCell>
                <TableCell className="py-3 text-right">
                  <span className="text-sm text-[#2c2e4b]">
                    {payment.amountPaid > 0 ? `KES ${payment.amountPaid.toLocaleString()}` : '-'}
                  </span>
                </TableCell>
                <TableCell className="py-3 text-right">
                  <span className={cn(
                    'text-sm font-semibold',
                    remaining > 0 ? 'text-[#caa26a]' : 'text-green-600'
                  )}>
                    {remaining > 0 ? `KES ${remaining.toLocaleString()}` : 'Paid'}
                  </span>
                </TableCell>
                <TableCell className="py-3">
                  <Badge
                    variant="outline"
                    className="text-[10px] font-medium px-2 py-0.5 rounded-none border-[#e7d6bf] text-[#2c2e4b]"
                  >
                    {getPaymentStatusLabel(payment.status)}
                  </Badge>
                </TableCell>
                <TableCell className="py-3">
                  <div className="flex items-center gap-1">
                    <Button
                      onClick={() => onViewPatient(payment.patient?.id || '')}
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-[#2c2e4b]/60 hover:text-[#2c2e4b]"
                    >
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Button>
                    {!isPaid && (
                      <Button
                        onClick={() => onCollectPayment(payment)}
                        size="sm"
                        className="h-7 px-2.5 text-xs bg-[#caa26a] hover:bg-[#b8913e] text-[#2c2e4b] rounded-lg font-medium shadow-sm"
                      >
                        <CreditCard className="h-3 w-3 mr-1" />
                        Collect
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
});

function ReceiptIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
    </svg>
  );
}
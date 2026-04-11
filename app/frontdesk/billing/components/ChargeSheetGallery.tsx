'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle, 
  Calendar, 
  ChevronDown, 
  Receipt,
  CreditCard,
  FileText
} from 'lucide-react';
import { format } from 'date-fns';
import { PaymentStatus, getPaymentStatusLabel } from '@/domain/enums/PaymentStatus';
import { BillType } from '@/domain/enums/BillType';
import type { PaymentWithRelations } from '@/domain/interfaces/repositories/IPaymentRepository';
import { cn } from '@/lib/utils';

const BILL_TYPE_CONFIG: Record<string, { label: string; className: string }> = {
  [BillType.CONSULTATION]: { label: 'Consultation', className: 'bg-slate-100 text-slate-700 border-slate-200/60' },
  [BillType.SURGERY]: { label: 'Surgery', className: 'bg-indigo-50 text-indigo-700 border-indigo-200/60' },
  [BillType.LAB_TEST]: { label: 'Lab Test', className: 'bg-teal-50 text-teal-700 border-teal-200/60' },
  [BillType.FOLLOW_UP]: { label: 'Follow-Up', className: 'bg-sky-50 text-sky-700 border-sky-200/60' },
  [BillType.OTHER]: { label: 'Other', className: 'bg-slate-50 text-slate-700 border-slate-200/60' },
};

interface ChargeSheetGalleryProps {
  payments: PaymentWithRelations[];
  onCollectPayment: (payment: PaymentWithRelations) => void;
  emptyMessageTitle?: string;
  emptyMessageDesc?: string;
  type: 'finalized' | 'draft';
}

export function ChargeSheetGallery({
  payments,
  onCollectPayment,
  emptyMessageTitle = "All caught up!",
  emptyMessageDesc = "No pending charge sheets right now.",
  type
}: ChargeSheetGalleryProps) {
  const [expandedPaymentId, setExpandedPaymentId] = useState<number | null>(null);

  if (payments.length === 0) {
    return (
      <Card className="border-slate-200 shadow-sm">
        <CardContent className="flex flex-col items-center justify-center py-16 px-4 text-center">
          <div className="h-12 w-12 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center mb-4">
            <CheckCircle className="h-6 w-6 text-slate-300" />
          </div>
          <p className="text-lg font-semibold text-slate-900">{emptyMessageTitle}</p>
          <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
            {emptyMessageDesc}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {payments.map((payment) => {
        const payable = payment.totalAmount - payment.discount;
        const remaining = payable - payment.amountPaid;
        const isExpanded = expandedPaymentId === payment.id;
        const hasBillItems = payment.billItems && payment.billItems.length > 0;
        const billTypeCfg = BILL_TYPE_CONFIG[payment.billType] || BILL_TYPE_CONFIG.OTHER;
        
        return (
          <Card
            key={payment.id}
            className={cn(
              "overflow-hidden transition-all duration-200",
              isExpanded 
                ? "border-slate-300 shadow-sm bg-white" 
                : "border-slate-200 shadow-sm hover:border-slate-300 bg-white"
            )}
          >
            <div className="p-3 sm:p-4 sm:px-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                {/* 1. Left Section - Caller ID / Charge Sheet Details */}
                <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
                  
                  {/* Expand Toggle */}
                  <div className="flex items-center pt-1 sm:pt-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className={cn(
                        "h-8 w-8 rounded-lg flex-shrink-0 transition-transform duration-200",
                        isExpanded ? "bg-slate-100 text-slate-900 rotate-180" : "text-slate-400 hover:text-slate-700 hover:bg-slate-50"
                      )}
                      onClick={() => setExpandedPaymentId(isExpanded ? null : payment.id)}
                      disabled={!hasBillItems}
                    >
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Icon */}
                  <div className={cn(
                    "h-10 w-10 flex items-center justify-center flex-shrink-0 rounded-lg",
                    type === 'finalized' ? "bg-slate-100 text-slate-700" : "bg-slate-50 text-slate-400"
                  )}>
                    {type === 'finalized' ? <Receipt className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
                  </div>
                  
                  {/* Meta Block */}
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-slate-900 text-sm truncate max-w-[200px] sm:max-w-[300px]">
                        {payment.patient?.firstName} {payment.patient?.lastName}
                      </p>
                      
                      {/* Charge Sheet ID */}
                      {payment.chargeSheetNo && (
                        <code className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200">
                          {payment.chargeSheetNo}
                        </code>
                      )}

                      <Badge variant="outline" className={cn("text-[10px] font-medium px-1.5 py-0 h-4.5 border flex-shrink-0", billTypeCfg.className)}>
                        {billTypeCfg.label}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-slate-500 flex-wrap">
                      <span className="flex items-center gap-1 text-slate-500">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(payment.billDate), 'MMM dd, yyyy')}
                      </span>
                      {payment.appointment && (
                        <span className="opacity-40">—</span>
                      )}
                      {payment.appointment && (
                        <span>{payment.appointment.time}</span>
                      )}
                      {payment.surgicalCase && (
                        <>
                          <span className="opacity-40">—</span>
                          <span className="text-indigo-600">
                            {payment.surgicalCase.procedureName || 'Surgery'}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* 2. Right Section - Balances & Actions */}
                <div className="flex items-center justify-between sm:justify-end gap-5 flex-shrink-0 border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-100 mt-2 sm:mt-0 ml-11 sm:ml-0">
                  <div className="text-left sm:text-right">
                    <p className="text-[10px] font-medium uppercase text-slate-400 mb-0.5">Remaining Balance</p>
                    <p className="text-lg font-bold text-slate-900 flex items-baseline gap-1 sm:justify-end">
                      <span className="text-[10px] text-slate-500 font-normal">KES</span>
                      {remaining.toLocaleString()}
                    </p>
                    {payment.discount > 0 && (
                      <p className="text-[10px] font-medium text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-sm inline-flex items-center mt-0.5 h-max ml-auto max-w-max">
                        -{payment.discount.toLocaleString()} discount
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col items-end gap-1.5">
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[10px] font-medium px-1.5 py-0",
                        payment.status === PaymentStatus.PART && "bg-amber-50 text-amber-700 border-amber-200/60",
                        payment.status === PaymentStatus.UNPAID && "bg-rose-50 text-rose-700 border-rose-200/60",
                        payment.status === PaymentStatus.PAID && "bg-emerald-50 text-emerald-700 border-emerald-200/60"
                      )}
                    >
                      {getPaymentStatusLabel(payment.status)}
                    </Badge>

                    {type === 'finalized' && (
                      <Button 
                        onClick={() => onCollectPayment(payment)}
                        size="sm"
                        className="bg-slate-900 hover:bg-slate-800 text-white font-medium h-7 rounded-md px-3 text-xs w-full shadow-sm"
                      >
                        <CreditCard className="h-3 w-3 mr-1.5" />
                        Collect
                      </Button>
                    )}
                    {type === 'draft' && payment.billType === 'SURGERY' && (
                      <Button 
                        onClick={() => onCollectPayment(payment)}
                        size="sm"
                        className="bg-slate-900 hover:bg-slate-800 text-white font-medium h-7 rounded-md px-3 text-xs w-full shadow-sm"
                      >
                        <CreditCard className="h-3 w-3 mr-1.5" />
                        Collect
                      </Button>
                    )}
                    {type === 'draft' && payment.billType !== 'SURGERY' && (
                      <div className="text-[10px] text-slate-400 flex items-center bg-slate-50 border border-slate-100 px-2 py-0.5 rounded">
                        In Progress
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Expanded Bill Items Panel */}
            {isExpanded && hasBillItems && (
              <div className="px-4 sm:px-5 pb-5 pt-1 bg-slate-50/50">
                <div className="bg-white border border-slate-200 rounded-lg p-4 ml-0 sm:ml-11 shadow-sm">
                  
                  <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100 border-dashed">
                    <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                      Itemized Bill
                    </p>
                    <p className="text-[10px] text-slate-400">
                      {payment.billItems?.length} items
                    </p>
                  </div>
                  
                  <div className="space-y-2.5">
                    {payment.billItems!.map((item, idx) => (
                      <div
                        key={item.id ?? idx}
                        className="flex items-start sm:items-center justify-between text-[13px]"
                      >
                        <div className="flex-1 pr-4">
                          <span className="text-slate-700">
                            {item.serviceName}
                          </span>
                        </div>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-end sm:gap-4 text-slate-500 flex-shrink-0">
                          <span className="text-right text-xs">
                            {item.quantity} × {item.unitCost.toLocaleString()}
                          </span>
                          <span className="font-medium text-slate-900 w-20 text-right">
                            {item.totalCost.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 space-y-1.5">
                    <div className="flex items-center justify-end text-xs gap-6">
                      <span className="text-slate-500">Subtotal</span>
                      <span className="font-medium text-slate-700 w-20 text-right">
                        {payment.totalAmount.toLocaleString()}
                      </span>
                    </div>
                    
                    {payment.discount > 0 && (
                      <div className="flex items-center justify-end text-xs gap-6 text-emerald-600">
                        <span>Discount</span>
                        <span className="w-20 text-right">
                          -{payment.discount.toLocaleString()}
                        </span>
                      </div>
                    )}
                    
                    {payment.amountPaid > 0 && (
                      <div className="flex items-center justify-end text-xs gap-6 text-slate-500">
                        <span>Previously Paid</span>
                        <span className="w-20 text-right">
                          -{payment.amountPaid.toLocaleString()}
                        </span>
                      </div>
                    )}
                    
                    <div className="flex items-center justify-end pt-2 mt-2 border-t border-slate-100">
                      <span className="text-[11px] font-semibold uppercase text-slate-500 mr-6">Total Due</span>
                      <span className="text-sm font-bold text-slate-900 w-20 text-right">
                        {remaining.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}

'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Search, 
  CheckCircle, 
  User, 
  Calendar, 
  ChevronDown, 
  ChevronUp, 
  Package,
  Receipt,
  CreditCard,
  AlertCircle
} from 'lucide-react';
import { format } from 'date-fns';
import { PaymentStatus, getPaymentStatusLabel } from '@/domain/enums/PaymentStatus';
import { BillType } from '@/domain/enums/BillType';
import type { PaymentWithRelations } from '@/domain/interfaces/repositories/IPaymentRepository';
import { cn } from '@/lib/utils';

const BILL_TYPE_CONFIG: Record<string, { label: string; className: string }> = {
  [BillType.CONSULTATION]: { label: 'Consultation', className: 'bg-blue-50 text-blue-700 border-blue-200' },
  [BillType.SURGERY]: { label: 'Surgery', className: 'bg-purple-50 text-purple-700 border-purple-200' },
  [BillType.LAB_TEST]: { label: 'Lab Test', className: 'bg-teal-50 text-teal-700 border-teal-200' },
  [BillType.FOLLOW_UP]: { label: 'Follow-Up', className: 'bg-sky-50 text-sky-700 border-sky-200' },
  [BillType.OTHER]: { label: 'Other', className: 'bg-slate-50 text-slate-700 border-slate-200' },
};

interface PendingPaymentsListProps {
  payments: PaymentWithRelations[];
  isLoading: boolean;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  onCollectPayment: (payment: PaymentWithRelations) => void;
}

export function PendingPaymentsList({
  payments,
  isLoading,
  searchQuery,
  setSearchQuery,
  onCollectPayment,
}: PendingPaymentsListProps) {
  const [expandedPaymentId, setExpandedPaymentId] = useState<number | null>(null);

  const filteredPayments = searchQuery
    ? payments.filter((p) =>
        p.patient?.firstName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.patient?.lastName?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : payments;

  if (isLoading) {
    return (
      <Card className="border-slate-200">
        <CardContent className="flex items-center justify-center py-16">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-muted-foreground">Loading payments...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (filteredPayments.length === 0) {
    return (
      <Card className="border-slate-200">
        <CardContent className="flex flex-col items-center justify-center py-16">
          <div className="h-14 w-14 rounded-2xl bg-emerald-50 flex items-center justify-center mb-4">
            <CheckCircle className="h-7 w-7 text-emerald-500" />
          </div>
          <p className="text-lg font-semibold text-slate-900">All caught up!</p>
          <p className="text-sm text-slate-500 mt-1">
            No pending payments at the moment
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader className="pb-4 border-b border-slate-100">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-amber-50 flex items-center justify-center">
              <Receipt className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <CardTitle className="text-lg font-semibold">Pending Payments</CardTitle>
              <CardDescription className="text-sm">
                {filteredPayments.length} bill{filteredPayments.length !== 1 ? 's' : ''} awaiting collection
              </CardDescription>
            </div>
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search by patient name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-slate-50/50 border-slate-200"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-slate-100">
          {filteredPayments.map((payment) => {
            const payable = payment.totalAmount - payment.discount;
            const remaining = payable - payment.amountPaid;
            const isExpanded = expandedPaymentId === payment.id;
            const hasBillItems = payment.billItems && payment.billItems.length > 0;
            const billTypeCfg = BILL_TYPE_CONFIG[payment.billType] || BILL_TYPE_CONFIG.OTHER;
            
            return (
              <div
                key={payment.id}
                className={cn(
                  "transition-colors hover:bg-slate-50/80",
                  isExpanded && "bg-slate-50/50"
                )}
              >
                <div className="p-4 sm:px-6">
                  <div className="flex items-center justify-between gap-4">
                    {/* Patient Info */}
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      {hasBillItems ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 flex-shrink-0 text-slate-400 hover:text-slate-600"
                          onClick={() => setExpandedPaymentId(isExpanded ? null : payment.id)}
                        >
                          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </Button>
                      ) : (
                        <div className="w-8" />
                      )}

                      <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center flex-shrink-0">
                        <User className="h-5 w-5 text-slate-500" />
                      </div>
                      
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-slate-900 truncate">
                            {payment.patient?.firstName} {payment.patient?.lastName}
                          </p>
                          <Badge variant="outline" className={cn("text-[10px] px-2 py-0 h-5 flex-shrink-0", billTypeCfg.className)}>
                            {billTypeCfg.label}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5 flex-wrap">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(payment.billDate), 'MMM dd, yyyy')}
                          </span>
                          {payment.appointment && (
                            <span>• {payment.appointment.time}</span>
                          )}
                          {payment.surgicalCase && (
                            <span className="text-purple-600">• {payment.surgicalCase.procedureName || 'Surgery'}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Amount & Action */}
                    <div className="flex items-center gap-4 flex-shrink-0">
                      <div className="text-right hidden sm:block">
                        <p className="text-xs text-slate-500">Balance Due</p>
                        <p className="text-lg font-bold text-slate-900">
                          KES {remaining.toLocaleString()}
                        </p>
                        {payment.discount > 0 && (
                          <p className="text-xs text-emerald-600">
                            -{payment.discount.toLocaleString()} discount
                          </p>
                        )}
                      </div>

                      <Badge
                        className={cn(
                          "text-xs font-medium px-2.5 py-1",
                          payment.status === PaymentStatus.PART && "bg-amber-50 text-amber-700 border-amber-200",
                          payment.status === PaymentStatus.UNPAID && "bg-red-50 text-red-700 border-red-200"
                        )}
                      >
                        {getPaymentStatusLabel(payment.status)}
                      </Badge>

                      <Button 
                        onClick={() => onCollectPayment(payment)}
                        size="sm"
                        className="bg-emerald-600 hover:bg-emerald-700 text-white"
                      >
                        <CreditCard className="h-3.5 w-3.5 mr-1.5" />
                        Collect
                      </Button>
                    </div>
                  </div>
                  
                  {/* Mobile amount display */}
                  <div className="flex items-center justify-between sm:hidden mt-3 pt-3 border-t border-slate-100">
                    <div>
                      <p className="text-xs text-slate-500">Balance Due</p>
                      <p className="text-lg font-bold text-slate-900">
                        KES {remaining.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Expanded Bill Items */}
                {isExpanded && hasBillItems && (
                  <div className="px-6 pb-4">
                    <div className="bg-white border border-slate-200 rounded-lg p-4 ml-11">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                        Itemized Bill
                      </p>
                      <div className="space-y-2">
                        {payment.billItems!.map((item, idx) => (
                          <div
                            key={item.id ?? idx}
                            className="flex items-center justify-between text-sm"
                          >
                            <span className="text-slate-700">{item.serviceName}</span>
                            <div className="flex items-center gap-4 text-slate-500">
                              <span className="text-xs">{item.quantity} × {item.unitCost.toLocaleString()}</span>
                              <span className="font-medium text-slate-900 w-20 text-right">
                                {item.totalCost.toLocaleString()}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="mt-3 pt-3 border-t border-slate-100 space-y-1.5">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-slate-600">Subtotal</span>
                          <span className="font-semibold">{payment.totalAmount.toLocaleString()}</span>
                        </div>
                        {payment.discount > 0 && (
                          <div className="flex items-center justify-between text-sm text-emerald-600">
                            <span>Discount</span>
                            <span>-{payment.discount.toLocaleString()}</span>
                          </div>
                        )}
                        {payment.amountPaid > 0 && (
                          <div className="flex items-center justify-between text-sm text-slate-500">
                            <span>Already Paid</span>
                            <span>-{payment.amountPaid.toLocaleString()}</span>
                          </div>
                        )}
                        <div className="flex items-center justify-between text-sm font-bold pt-1 border-t border-slate-100">
                          <span>Balance Due</span>
                          <span className="text-amber-600">{remaining.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

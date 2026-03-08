'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
  Package 
} from 'lucide-react';
import { format } from 'date-fns';
import { PaymentStatus, getPaymentStatusLabel } from '@/domain/enums/PaymentStatus';
import { BillType } from '@/domain/enums/BillType';
import type { PaymentWithRelations } from '@/domain/interfaces/repositories/IPaymentRepository';

const BILL_TYPE_CONFIG: Record<string, { label: string; className: string }> = {
  [BillType.CONSULTATION]: { label: 'Consultation', className: 'bg-blue-100 text-blue-700 border-blue-200' },
  [BillType.SURGERY]: { label: 'Surgery', className: 'bg-purple-100 text-purple-700 border-purple-200' },
  [BillType.LAB_TEST]: { label: 'Lab Test', className: 'bg-teal-100 text-teal-700 border-teal-200' },
  [BillType.FOLLOW_UP]: { label: 'Follow-Up', className: 'bg-sky-100 text-sky-700 border-sky-200' },
  [BillType.OTHER]: { label: 'Other', className: 'bg-gray-100 text-gray-700 border-gray-200' },
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

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Pending Payments</CardTitle>
            <CardDescription>Bills waiting for payment collection</CardDescription>
          </div>
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search patient..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-sm text-muted-foreground">Loading payments...</p>
          </div>
        ) : filteredPayments.length === 0 ? (
          <div className="text-center py-12">
            <CheckCircle className="h-12 w-12 text-emerald-500 mx-auto mb-4" />
            <p className="text-lg font-medium">All caught up!</p>
            <p className="text-sm text-muted-foreground mt-1">
              No pending payments at the moment
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredPayments.map((payment) => {
              const payable = payment.totalAmount - payment.discount;
              const remaining = payable - payment.amountPaid;
              const isExpanded = expandedPaymentId === payment.id;
              const hasBillItems = payment.billItems && payment.billItems.length > 0;
              
              return (
                <div
                  key={payment.id}
                  className="border rounded-lg hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-4">
                      {hasBillItems ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 flex-shrink-0"
                          onClick={() => setExpandedPaymentId(isExpanded ? null : payment.id)}
                        >
                          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </Button>
                      ) : (
                        <div className="w-8" />
                      )}

                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold">
                            {payment.patient?.firstName} {payment.patient?.lastName}
                          </p>
                          {payment.billType && BILL_TYPE_CONFIG[payment.billType] && (
                            <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${BILL_TYPE_CONFIG[payment.billType].className}`}>
                              {BILL_TYPE_CONFIG[payment.billType].label}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          <span>{format(new Date(payment.billDate), 'MMM dd, yyyy')}</span>
                          {payment.appointment && (
                            <>
                              <span>•</span>
                              <span>{payment.appointment.time}</span>
                            </>
                          )}
                          {payment.surgicalCase && (
                            <>
                              <span>•</span>
                              <span className="text-purple-600">{payment.surgicalCase.procedureName || 'Surgery'}</span>
                            </>
                          )}
                          {hasBillItems && (
                            <>
                              <span>•</span>
                              <Package className="h-3 w-3" />
                              <span>{payment.billItems!.length} item{payment.billItems!.length !== 1 ? 's' : ''}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Amount Due</p>
                        <p className="font-bold text-lg">{remaining.toLocaleString()}</p>
                        {payment.discount > 0 && (
                          <p className="text-xs text-emerald-600">
                            -{payment.discount.toLocaleString()} discount
                          </p>
                        )}
                      </div>

                      <Badge
                        variant={payment.status === PaymentStatus.PART ? 'secondary' : 'outline'}
                        className={payment.status === PaymentStatus.PART ? 'bg-amber-100 text-amber-700 border-amber-200' : ''}
                      >
                        {getPaymentStatusLabel(payment.status)}
                        {payment.status === PaymentStatus.PART && (
                          <span className="ml-1">
                            ({payment.amountPaid.toLocaleString()} paid)
                          </span>
                        )}
                      </Badge>

                      <Button onClick={() => onCollectPayment(payment)}>
                        Collect Payment
                      </Button>
                    </div>
                  </div>

                  {isExpanded && hasBillItems && (
                    <div className="border-t bg-muted/20 px-4 py-3 mx-4 mb-4 rounded-md">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                        Itemized Bill
                      </p>
                      <div className="space-y-1.5">
                        {payment.billItems!.map((item, idx) => (
                          <div
                            key={item.id ?? idx}
                            className="flex items-center justify-between text-sm"
                          >
                            <span className="text-foreground">{item.serviceName}</span>
                            <div className="flex items-center gap-4 text-muted-foreground">
                              <span>{item.quantity} × {item.unitCost.toLocaleString()}</span>
                              <span className="font-medium text-foreground w-20 text-right">
                                {item.totalCost.toLocaleString()}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="flex items-center justify-between mt-2 pt-2 border-t text-sm">
                        <span className="font-medium">Subtotal</span>
                        <span className="font-bold">
                          {payment.totalAmount.toLocaleString()}
                        </span>
                      </div>
                      {payment.discount > 0 && (
                        <div className="flex items-center justify-between text-sm text-emerald-600">
                          <span>Discount</span>
                          <span>-{payment.discount.toLocaleString()}</span>
                        </div>
                      )}
                      {payment.amountPaid > 0 && (
                        <div className="flex items-center justify-between text-sm text-muted-foreground">
                          <span>Already Paid</span>
                          <span>-{payment.amountPaid.toLocaleString()}</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between text-sm font-bold mt-1 pt-1 border-t">
                        <span>Balance Due</span>
                        <span>{remaining.toLocaleString()}</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

'use client';

/**
 * Frontdesk Billing Page
 * 
 * Manage patient payments and billing.
 * 
 * Features:
 * - View pending payments queue
 * - Record payments (full or partial)
 * - View today's billing summary
 * - Search/filter payments
 */

import { useState } from 'react';
import { useAuth } from '@/hooks/patient/useAuth';
import { usePendingPayments, useRecordPayment } from '@/hooks/frontdesk/useBilling';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  DollarSign, 
  Receipt, 
  Clock, 
  CheckCircle, 
  User, 
  Calendar,
  CreditCard,
  Banknote,
  Smartphone,
  Building,
  Search,
  TrendingUp,
  ChevronDown,
  ChevronUp,
  Package,
} from 'lucide-react';
import { format } from 'date-fns';
import { PaymentStatus, getPaymentStatusLabel } from '@/domain/enums/PaymentStatus';
import { PaymentMethod, getPaymentMethodLabel } from '@/domain/enums/PaymentMethod';
import type { PaymentWithRelations } from '@/domain/interfaces/repositories/IPaymentRepository';

export default function FrontdeskBillingPage() {
  const { user, isAuthenticated } = useAuth();
  const { data: billingData, isLoading, refetch } = usePendingPayments(isAuthenticated);
  const { mutateAsync: recordPayment, isPending: isRecording } = useRecordPayment();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPayment, setSelectedPayment] = useState<PaymentWithRelations | null>(null);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PaymentMethod.CASH);
  const [expandedPaymentId, setExpandedPaymentId] = useState<number | null>(null);

  if (!isAuthenticated || !user) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-muted-foreground">Please log in to access billing</p>
      </div>
    );
  }

  const pendingPayments = billingData?.payments || [];
  const summary = billingData?.summary;

  // Filter payments by search query
  const filteredPayments = searchQuery
    ? pendingPayments.filter((p) =>
        p.patient?.firstName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.patient?.lastName?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : pendingPayments;

  const handleOpenPaymentDialog = (payment: PaymentWithRelations) => {
    setSelectedPayment(payment);
    const remaining = payment.totalAmount - payment.discount - payment.amountPaid;
    setPaymentAmount(remaining.toString());
    setPaymentMethod(PaymentMethod.CASH);
    setPaymentDialogOpen(true);
  };

  const handleRecordPayment = async () => {
    if (!selectedPayment || !paymentAmount) return;

    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      return;
    }

    await recordPayment({
      paymentId: selectedPayment.id,
      amountPaid: amount,
      paymentMethod,
    });

    setPaymentDialogOpen(false);
    setSelectedPayment(null);
    setPaymentAmount('');
  };

  const getPaymentMethodIcon = (method: PaymentMethod) => {
    const icons: Record<PaymentMethod, React.ReactNode> = {
      [PaymentMethod.CASH]: <Banknote className="h-4 w-4" />,
      [PaymentMethod.CARD]: <CreditCard className="h-4 w-4" />,
      [PaymentMethod.MOBILE_MONEY]: <Smartphone className="h-4 w-4" />,
      [PaymentMethod.BANK_TRANSFER]: <Building className="h-4 w-4" />,
    };
    return icons[method];
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Billing & Payments</h1>
        <p className="text-muted-foreground mt-1">
          Manage patient payments and view billing summary
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending Bills</p>
                <p className="text-2xl font-bold">{summary?.pendingCount || 0}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-amber-100 flex items-center justify-center">
                <Clock className="h-6 w-6 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Collected Today</p>
                <p className="text-2xl font-bold">
                  {(summary?.totalCollected || 0).toLocaleString()}
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-emerald-100 flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Billed Today</p>
                <p className="text-2xl font-bold">
                  {(summary?.totalBilled || 0).toLocaleString()}
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                <Receipt className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Paid Today</p>
                <p className="text-2xl font-bold">{summary?.paidCount || 0}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Payments */}
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
                    {/* Main Row */}
                    <div className="flex items-center justify-between p-4">
                      <div className="flex items-center gap-4">
                        {/* Expand Toggle */}
                        {hasBillItems && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 flex-shrink-0"
                            onClick={() => setExpandedPaymentId(isExpanded ? null : payment.id)}
                          >
                            {isExpanded
                              ? <ChevronUp className="h-4 w-4" />
                              : <ChevronDown className="h-4 w-4" />
                            }
                          </Button>
                        )}
                        {!hasBillItems && <div className="w-8" />}

                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <User className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-semibold">
                            {payment.patient?.firstName} {payment.patient?.lastName}
                          </p>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            <span>{format(new Date(payment.billDate), 'MMM dd, yyyy')}</span>
                            {payment.appointment && (
                              <>
                                <span>•</span>
                                <span>{payment.appointment.time}</span>
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
                          variant={
                            payment.status === PaymentStatus.PART
                              ? 'secondary'
                              : 'outline'
                          }
                          className={
                            payment.status === PaymentStatus.PART
                              ? 'bg-amber-100 text-amber-700 border-amber-200'
                              : ''
                          }
                        >
                          {getPaymentStatusLabel(payment.status)}
                          {payment.status === PaymentStatus.PART && (
                            <span className="ml-1">
                              ({payment.amountPaid.toLocaleString()} paid)
                            </span>
                          )}
                        </Badge>

                        <Button onClick={() => handleOpenPaymentDialog(payment)}>
                          Collect Payment
                        </Button>
                      </div>
                    </div>

                    {/* Expandable Bill Items Section */}
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

      {/* Payment Dialog */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
            <DialogDescription>
              {selectedPayment && (
                <span>
                  Collecting payment from {selectedPayment.patient?.firstName}{' '}
                  {selectedPayment.patient?.lastName}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          {selectedPayment && (
            <div className="space-y-4 py-4">
              {/* Itemized Bill Details */}
              {selectedPayment.billItems && selectedPayment.billItems.length > 0 && (
                <div className="bg-muted/30 rounded-lg p-4 space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    Services Rendered
                  </p>
                  <div className="space-y-1.5">
                    {selectedPayment.billItems.map((item, idx) => (
                      <div
                        key={item.id ?? idx}
                        className="flex items-center justify-between text-sm"
                      >
                        <span>{item.serviceName}</span>
                        <div className="flex items-center gap-3 text-muted-foreground">
                          <span className="text-xs">{item.quantity} × {item.unitCost.toLocaleString()}</span>
                          <span className="font-medium text-foreground w-20 text-right">
                            {item.totalCost.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Payment Summary */}
              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Total Amount</span>
                  <span>{selectedPayment.totalAmount.toLocaleString()}</span>
                </div>
                {selectedPayment.discount > 0 && (
                  <div className="flex justify-between text-sm text-emerald-600">
                    <span>Discount</span>
                    <span>-{selectedPayment.discount.toLocaleString()}</span>
                  </div>
                )}
                {selectedPayment.amountPaid > 0 && (
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Already Paid</span>
                    <span>-{selectedPayment.amountPaid.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold pt-2 border-t">
                  <span>Balance Due</span>
                  <span>
                    {(
                      selectedPayment.totalAmount -
                      selectedPayment.discount -
                      selectedPayment.amountPaid
                    ).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Amount Input */}
              <div className="space-y-2">
                <Label htmlFor="amount">Payment Amount</Label>
                <Input
                  id="amount"
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder="Enter amount"
                />
              </div>

              {/* Payment Method */}
              <div className="space-y-2">
                <Label>Payment Method</Label>
                <Select
                  value={paymentMethod}
                  onValueChange={(value) => setPaymentMethod(value as PaymentMethod)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(PaymentMethod).map((method) => (
                      <SelectItem key={method} value={method}>
                        <div className="flex items-center gap-2">
                          {getPaymentMethodIcon(method)}
                          {getPaymentMethodLabel(method)}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setPaymentDialogOpen(false)}
              disabled={isRecording}
            >
              Cancel
            </Button>
            <Button
              onClick={handleRecordPayment}
              disabled={!paymentAmount || isRecording}
            >
              {isRecording ? 'Recording...' : 'Record Payment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/**
 * PatientBillingPanel Component
 * 
 * Displays patient billing and payment history.
 */

'use client';

import { useQuery } from '@tanstack/react-query';
import { CreditCard, Calendar, DollarSign, FileText, Loader2, AlertCircle, CheckCircle, Receipt } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { apiClient } from '@/lib/api/client';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { PaymentStatus } from '@/domain/enums/PaymentStatus';
import { BillType } from '@/domain/enums/BillType';

interface Payment {
    id: number;
    patientId: string;
    appointmentId: number | null;
    surgicalCaseId: string | null;
    billType: BillType;
    billDate: Date;
    paymentDate: Date | null;
    discount: number;
    totalAmount: number;
    amountPaid: number;
    paymentMethod: string | null;
    status: PaymentStatus;
    receiptNumber: string | null;
    notes: string | null;
    createdAt: Date;
    updatedAt: Date;
    appointment?: {
        id: number;
        appointmentDate: Date;
        time: string;
        doctorId: string;
        doctorName?: string;
    } | null;
    patient?: {
        id: string;
        firstName: string;
        lastName: string;
    } | null;
}

interface PatientBillingPanelProps {
    patientId: string;
}

const STATUS_CONFIG: Record<PaymentStatus, { label: string }> = {
    [PaymentStatus.PAID]: { label: 'Paid' },
    [PaymentStatus.PART]: { label: 'Partial' },
    [PaymentStatus.UNPAID]: { label: 'Unpaid' },
};

const BILL_TYPE_CONFIG: Record<string, { label: string }> = {
    [BillType.CONSULTATION]: { label: 'Consultation' },
    [BillType.SURGERY]: { label: 'Surgery' },
    [BillType.LAB_TEST]: { label: 'Lab Test' },
    [BillType.FOLLOW_UP]: { label: 'Follow-Up' },
    [BillType.OTHER]: { label: 'Other' },
};

export function PatientBillingPanel({ patientId }: PatientBillingPanelProps) {
    const { data, isLoading, isError } = useQuery<Payment[]>({
        queryKey: ['payments', 'patient', patientId],
        queryFn: async (): Promise<Payment[]> => {
            const response = await apiClient.get<Payment[]>(`/payments/patient/${patientId}`);
            if (!response.success) {
                throw new Error(response.error || 'Failed to load payments');
            }
            return response.data || [];
        },
        staleTime: 1000 * 60 * 2,
        enabled: !!patientId,
    });
    
    const payments: Payment[] = data || [];

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-16">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading billing information…
                </div>
            </div>
        );
    }

    if (isError) {
        return (
            <div className="flex flex-col items-center justify-center py-16 text-center gap-2">
                <AlertCircle className="h-8 w-8 text-destructive/40" />
                <p className="text-sm text-muted-foreground">Failed to load billing information</p>
            </div>
        );
    }

    // Calculate totals
    const totalBilled = payments.reduce((sum, p) => sum + (p.totalAmount || 0), 0);
    const totalPaid = payments.reduce((sum, p) => sum + (p.amountPaid || 0), 0);
    const pending = totalBilled - totalPaid;
    const paidCount = payments.filter(p => p.status === PaymentStatus.PAID).length;
    const pendingCount = payments.filter(p => p.status === PaymentStatus.UNPAID || p.status === PaymentStatus.PART).length;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
                        <CreditCard size={16} className="text-primary" />
                        Billing & Payments
                    </h2>
                </div>
                <Badge variant="outline" className="text-xs rounded-none">
                    {payments.length} bill{payments.length !== 1 ? 's' : ''}
                </Badge>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="border border-border bg-white p-4">
                    <p className="text-xs text-muted-foreground">Total billed</p>
                    <p className="mt-1 text-base font-semibold text-foreground">KES {totalBilled.toLocaleString()}</p>
                </div>
                <div className="border border-border bg-white p-4">
                    <p className="text-xs text-muted-foreground">Total paid</p>
                    <p className="mt-1 text-base font-semibold text-foreground">KES {totalPaid.toLocaleString()}</p>
                </div>
                <div className="border border-border bg-white p-4">
                    <p className="text-xs text-muted-foreground">Balance due</p>
                    <p className="mt-1 text-base font-semibold text-foreground">KES {pending.toLocaleString()}</p>
                </div>
            </div>

            {/* Payment History */}
            {payments.length === 0 ? (
                <Card className="border-slate-200 bg-white">
                    <CardContent className="pt-6">
                        <div className="flex flex-col items-center justify-center py-12 text-center gap-3">
                            <CreditCard className="h-6 w-6 text-slate-300" />
                            <div>
                                <p className="text-sm font-medium text-foreground">No billing records yet</p>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    Billing information will appear here after consultations
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-3">
                    {payments.map((payment) => {
                        const statusCfg = STATUS_CONFIG[payment.status] || STATUS_CONFIG.UNPAID;
                        const billTypeCfg = BILL_TYPE_CONFIG[payment.billType] || BILL_TYPE_CONFIG.OTHER;
                        const balance = (payment.totalAmount || 0) - (payment.amountPaid || 0);
                        
                        return (
                            <Card key={payment.id} className="border-slate-200 hover:border-slate-300 transition-colors">
                                <CardContent className="pt-6">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-3">
                                                <Badge variant="outline" className="text-xs rounded-none">
                                                    {billTypeCfg.label}
                                                </Badge>
                                                <span className="text-xs text-muted-foreground">
                                                    {payment.billDate && format(new Date(payment.billDate), 'MMM d, yyyy')}
                                                </span>
                                                {payment.receiptNumber && (
                                                    <span className="text-xs text-muted-foreground">
                                                        · #{payment.receiptNumber}
                                                    </span>
                                                )}
                                            </div>
                                            
                                            <div className="flex items-center gap-6">
                                                <div>
                                                    <p className="text-xs text-muted-foreground mb-1">Total</p>
                                                    <p className="text-lg font-semibold text-foreground">
                                                        KES {(payment.totalAmount || 0).toLocaleString()}
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-muted-foreground mb-1">Paid</p>
                                                    <p className="text-lg font-semibold text-foreground">
                                                        KES {(payment.amountPaid || 0).toLocaleString()}
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-muted-foreground mb-1">Balance</p>
                                                    <p className="text-lg font-semibold text-foreground">
                                                        KES {balance.toLocaleString()}
                                                    </p>
                                                </div>
                                            </div>
                                            
                                            {payment.appointment && (
                                                <div className="flex items-center gap-2 mt-3">
                                                    <Calendar size={12} className="text-muted-foreground" />
                                                    <span className="text-xs text-muted-foreground">
                                                        {format(new Date(payment.appointment.appointmentDate), 'MMM d, yyyy')} at {payment.appointment.time}
                                                    </span>
                                                    {payment.appointment.doctorName && (
                                                        <span className="text-xs text-muted-foreground">
                                                            · Dr. {payment.appointment.doctorName}
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                        
                                        <div className="flex flex-col items-end gap-2">
                                            <Badge variant="outline" className="text-xs font-medium rounded-none">
                                                {statusCfg.label}
                                            </Badge>
                                            {payment.appointmentId && (
                                                <Link href={`/frontdesk/appointments/${payment.appointmentId}`}>
                                                    <Button size="sm" variant="ghost" className="h-7 text-xs rounded-none">
                                                        View Details
                                                    </Button>
                                                </Link>
                                            )}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

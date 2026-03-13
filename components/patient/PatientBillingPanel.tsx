/**
 * PatientBillingPanel Component
 * 
 * Displays patient billing and payment history.
 */

'use client';

import { useQuery } from '@tanstack/react-query';
import { CreditCard, Calendar, DollarSign, FileText, Loader2, AlertCircle, CheckCircle, Receipt } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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

const STATUS_CONFIG: Record<PaymentStatus, { bg: string; border: string; label: string }> = {
    [PaymentStatus.PAID]: { bg: 'bg-emerald-50', border: 'border-emerald-200', label: 'Paid' },
    [PaymentStatus.PART]: { bg: 'bg-amber-50', border: 'border-amber-200', label: 'Partial' },
    [PaymentStatus.UNPAID]: { bg: 'bg-red-50', border: 'border-red-200', label: 'Unpaid' },
};

const BILL_TYPE_CONFIG: Record<string, { label: string; className: string }> = {
    [BillType.CONSULTATION]: { label: 'Consultation', className: 'bg-blue-100 text-blue-700 border-blue-200' },
    [BillType.SURGERY]: { label: 'Surgery', className: 'bg-purple-100 text-purple-700 border-purple-200' },
    [BillType.LAB_TEST]: { label: 'Lab Test', className: 'bg-teal-100 text-teal-700 border-teal-200' },
    [BillType.FOLLOW_UP]: { label: 'Follow-Up', className: 'bg-sky-100 text-sky-700 border-sky-200' },
    [BillType.OTHER]: { label: 'Other', className: 'bg-gray-100 text-gray-700 border-gray-200' },
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
                    <p className="text-xs text-muted-foreground mt-0.5">
                        Payment history and billing information
                    </p>
                </div>
                <Badge variant="outline" className="text-xs">
                    {payments.length} bill{payments.length !== 1 ? 's' : ''}
                </Badge>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card className="border-slate-200">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                                    Total Billed
                                </p>
                                <p className="text-2xl font-bold text-foreground">
                                    KES {totalBilled.toLocaleString()}
                                </p>
                            </div>
                            <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center">
                                <Receipt className="h-6 w-6 text-slate-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-slate-200">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                                    Total Paid
                                </p>
                                <p className="text-2xl font-bold text-emerald-600">
                                    KES {totalPaid.toLocaleString()}
                                </p>
                            </div>
                            <div className="h-12 w-12 rounded-full bg-emerald-50 flex items-center justify-center">
                                <CheckCircle className="h-6 w-6 text-emerald-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-slate-200">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                                    Balance Due
                                </p>
                                <p className="text-2xl font-bold text-amber-600">
                                    KES {pending.toLocaleString()}
                                </p>
                            </div>
                            <div className="h-12 w-12 rounded-full bg-amber-50 flex items-center justify-center">
                                <AlertCircle className="h-6 w-6 text-amber-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Payment History */}
            {payments.length === 0 ? (
                <Card className="border-slate-200 bg-slate-50/30">
                    <CardContent className="pt-6">
                        <div className="flex flex-col items-center justify-center py-12 text-center gap-3">
                            <div className="h-12 w-12 rounded-xl bg-slate-100 flex items-center justify-center">
                                <CreditCard className="h-6 w-6 text-slate-400" />
                            </div>
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
                            <Card key={payment.id} className={cn("border-slate-200 hover:border-primary/30 transition-colors", statusCfg.bg)}>
                                <CardContent className="pt-6">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-3">
                                                <Badge className={cn("text-xs", billTypeCfg.className)}>
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
                                                    <p className="text-lg font-semibold text-emerald-600">
                                                        KES {(payment.amountPaid || 0).toLocaleString()}
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-muted-foreground mb-1">Balance</p>
                                                    <p className={cn("text-lg font-semibold", balance > 0 ? "text-amber-600" : "text-slate-600")}>
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
                                            <Badge
                                                className={cn(
                                                    "text-xs font-medium",
                                                    payment.status === PaymentStatus.PAID && "bg-emerald-100 text-emerald-700 border-emerald-200",
                                                    payment.status === PaymentStatus.PART && "bg-amber-100 text-amber-700 border-amber-200",
                                                    payment.status === PaymentStatus.UNPAID && "bg-red-100 text-red-700 border-red-200"
                                                )}
                                            >
                                                {statusCfg.label}
                                            </Badge>
                                            {payment.appointmentId && (
                                                <Link href={`/frontdesk/appointments/${payment.appointmentId}`}>
                                                    <Button size="sm" variant="ghost" className="h-7 text-xs">
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

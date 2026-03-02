/**
 * PatientBillingPanel Component
 * 
 * Displays patient billing and payment history.
 * Uses React Query to fetch data without extra API calls if already cached.
 */

'use client';

import { useQuery } from '@tanstack/react-query';
import { CreditCard, Calendar, DollarSign, FileText, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { apiClient } from '@/lib/api/client';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface Payment {
    id: number;
    appointment_id: number;
    total_amount: number;
    discount?: number;
    status: string;
    payment_method?: string;
    created_at: string;
    appointment?: {
        id: number;
        appointment_date: string;
        doctor?: {
            name: string;
        };
    };
}

interface PatientBillingPanelProps {
    patientId: string;
}

export function PatientBillingPanel({ patientId }: PatientBillingPanelProps) {
    const { data, isLoading, isError } = useQuery<Payment[]>({
        queryKey: ['payments', 'patient', patientId],
        queryFn: async (): Promise<Payment[]> => {
            // Fetch payments for this patient via appointments
            const response = await apiClient.get<Payment[]>(`/appointments?patientId=${patientId}`);
            if (!response.success) {
                throw new Error(response.error || 'Failed to load payments');
            }
            
            // For now, we'll show a message that billing is linked to appointments
            // In a full implementation, you'd fetch payments directly
            return response.data || [];
        },
        staleTime: 1000 * 60 * 2, // 2 minutes
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

    // Calculate totals - with null safety
    const totalPaid = (payments || []).reduce((sum, p) => sum + (p.total_amount || 0), 0);
    const totalPending = (payments || []).filter(p => p.status === 'PENDING').reduce((sum, p) => sum + (p.total_amount || 0), 0);

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
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Card className="border-slate-200">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                                    Total Paid
                                </p>
                                <p className="text-2xl font-bold text-foreground">
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
                                    Pending
                                </p>
                                <p className="text-2xl font-bold text-foreground">
                                    KES {totalPending.toLocaleString()}
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
                                    Billing information will appear here after appointments
                                </p>
                            </div>
                            <p className="text-xs text-muted-foreground mt-2">
                                💡 Billing is linked to appointments. View appointments to see billing details.
                            </p>
                        </div>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-3">
                    {payments.map((payment) => (
                        <Card key={payment.id} className="border-slate-200 hover:border-primary/30 transition-colors">
                            <CardContent className="pt-6">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Calendar size={14} className="text-muted-foreground" />
                                            {payment.appointment?.appointment_date && (
                                                <span className="text-xs text-muted-foreground">
                                                    {format(new Date(payment.appointment.appointment_date), "MMM d, yyyy")}
                                                </span>
                                            )}
                                        </div>
                                        {payment.appointment?.doctor && (
                                            <p className="text-sm text-muted-foreground mb-1">
                                                Dr. {payment.appointment.doctor.name}
                                            </p>
                                        )}
                                        <div className="flex items-center gap-2 mt-2">
                                            <DollarSign size={14} className="text-muted-foreground" />
                                            <span className="text-lg font-semibold text-foreground">
                                                KES {(payment.total_amount || 0).toLocaleString()}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end gap-2">
                                        <Badge
                                            variant={payment.status === 'PAID' ? 'default' : 'secondary'}
                                            className={cn(
                                                payment.status === 'PAID' && 'bg-emerald-100 text-emerald-700 border-emerald-200',
                                                payment.status === 'PENDING' && 'bg-amber-100 text-amber-700 border-amber-200'
                                            )}
                                        >
                                            {payment.status}
                                        </Badge>
                                        {payment.appointment_id && (
                                            <Link href={`/frontdesk/appointments/${payment.appointment_id}`}>
                                                <Button size="sm" variant="ghost" className="h-7 text-xs">
                                                    View Details
                                                </Button>
                                            </Link>
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Info Note */}
            <Card className="border-blue-200 bg-blue-50/50">
                <CardContent className="pt-6">
                    <div className="flex items-start gap-3">
                        <FileText size={16} className="text-blue-600 mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-blue-900 mb-1">Billing Information</p>
                            <p className="text-xs text-blue-700 leading-relaxed">
                                Billing details are linked to appointments. To view detailed bills, visit the appointment details page.
                                Payments are processed after consultations.
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

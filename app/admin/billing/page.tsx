'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import {
    CreditCard,
    Search,
    Filter,
    Download,
    Eye,
    DollarSign,
    Clock,
    CheckCircle,
    AlertCircle,
    RefreshCw,
    TrendingUp,
    Calendar,
    FileText,
    User,
    ChevronLeft,
    ChevronRight
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from '@/components/ui/table';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface BillItem {
    id: number;
    serviceName: string;
    quantity: number;
    unitCost: number;
    totalCost: number;
}

interface PaymentRecord {
    id: number;
    patientId: string;
    appointmentId: number | null;
    surgicalCaseId: string | null;
    billType: string;
    billDate: string;
    paymentDate: string | null;
    discount: number;
    totalAmount: number;
    amountPaid: number;
    paymentMethod: string | null;
    status: string;
    receiptNumber: string | null;
    notes: string | null;
    createdAt: string;
    patient?: {
        id: string;
        firstName: string;
        lastName: string;
        phone?: string;
    };
    appointment?: {
        id: number;
        appointmentDate: string;
        time: string;
        doctorName?: string;
    } | null;
    surgicalCase?: {
        id: string;
        procedureName: string;
        surgeonName?: string;
    } | null;
    billItems?: BillItem[];
}

const BILL_TYPE_CONFIG: Record<string, { label: string; className: string }> = {
    CONSULTATION: { label: 'Consultation', className: 'bg-blue-50 text-blue-700 border-blue-200' },
    SURGERY: { label: 'Surgery', className: 'bg-purple-50 text-purple-700 border-purple-200' },
    LAB_TEST: { label: 'Lab Test', className: 'bg-teal-50 text-teal-700 border-teal-200' },
    FOLLOW_UP: { label: 'Follow-Up', className: 'bg-sky-50 text-sky-700 border-sky-200' },
    OTHER: { label: 'Other', className: 'bg-slate-50 text-slate-700 border-slate-200' },
};

const STATUS_CONFIG: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
    PAID: { label: 'Paid', className: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: <CheckCircle className="h-3 w-3" /> },
    PART: { label: 'Partial', className: 'bg-amber-50 text-amber-700 border-amber-200', icon: <Clock className="h-3 w-3" /> },
    UNPAID: { label: 'Unpaid', className: 'bg-red-50 text-red-700 border-red-200', icon: <AlertCircle className="h-3 w-3" /> },
};

export default function AdminBillingPage() {
    const router = useRouter();
    const [payments, setPayments] = useState<PaymentRecord[]>([]);
    const [summary, setSummary] = useState({
        totalBilled: 0,
        totalCollected: 0,
        pendingCount: 0,
        paidCount: 0
    });
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [typeFilter, setTypeFilter] = useState('all');
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize] = useState(15);
    const [dateRange, setDateRange] = useState('all');

    const fetchPayments = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/payments/all');
            const data = await res.json();
            if (data.success) {
                setPayments(data.data.payments || []);
                setSummary(data.data.summary || { totalBilled: 0, totalCollected: 0, pendingCount: 0, paidCount: 0 });
            }
        } catch (error) {
            console.error('Failed to fetch payments:', error);
            toast.error('Failed to load billing data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPayments();
    }, []);

    const filteredPayments = useMemo(() => {
        let result = [...payments];

        // Search filter
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            result = result.filter(p =>
                p.patient?.firstName?.toLowerCase().includes(term) ||
                p.patient?.lastName?.toLowerCase().includes(term) ||
                p.receiptNumber?.toLowerCase().includes(term) ||
                p.surgicalCase?.procedureName?.toLowerCase().includes(term)
            );
        }

        // Status filter
        if (statusFilter !== 'all') {
            result = result.filter(p => p.status === statusFilter);
        }

        // Type filter
        if (typeFilter !== 'all') {
            result = result.filter(p => p.billType === typeFilter);
        }

        // Date range filter
        if (dateRange !== 'all') {
            const now = new Date();
            let startDate: Date;
            
            switch (dateRange) {
                case 'today':
                    startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                    break;
                case 'week':
                    startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                    break;
                case 'month':
                    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                    break;
                default:
                    startDate = new Date(0);
            }
            
            result = result.filter(p => new Date(p.billDate) >= startDate);
        }

        // Sort by bill date (newest first)
        result.sort((a, b) => new Date(b.billDate).getTime() - new Date(a.billDate).getTime());
        
        return result;
    }, [payments, searchTerm, statusFilter, typeFilter, dateRange]);

    const paginatedPayments = useMemo(() => {
        const start = (currentPage - 1) * pageSize;
        return filteredPayments.slice(start, start + pageSize);
    }, [filteredPayments, currentPage, pageSize]);

    const totalPages = Math.ceil(filteredPayments.length / pageSize);

    const handleSearchChange = (term: string) => {
        setSearchTerm(term);
        setCurrentPage(1);
    };

    const totalBilled = filteredPayments.reduce((sum, p) => sum + p.totalAmount, 0);
    const totalPaid = filteredPayments.reduce((sum, p) => sum + p.amountPaid, 0);
    const totalPending = totalBilled - totalPaid;

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Billing & Payments</h1>
                    <p className="text-sm text-slate-500 mt-1">
                        Manage all patient billing, payments, and financial records
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={fetchPayments}>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Refresh
                    </Button>
                    <Button variant="outline">
                        <Download className="h-4 w-4 mr-2" />
                        Export
                    </Button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="border-slate-200">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Total Billed</p>
                                <p className="text-2xl font-bold text-slate-900 mt-1">
                                    KES {totalBilled.toLocaleString()}
                                </p>
                            </div>
                            <div className="h-12 w-12 rounded-full bg-blue-50 flex items-center justify-center">
                                <FileText className="h-6 w-6 text-blue-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-slate-200">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Collected</p>
                                <p className="text-2xl font-bold text-emerald-600 mt-1">
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
                                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Pending</p>
                                <p className="text-2xl font-bold text-amber-600 mt-1">
                                    KES {totalPending.toLocaleString()}
                                </p>
                            </div>
                            <div className="h-12 w-12 rounded-full bg-amber-50 flex items-center justify-center">
                                <Clock className="h-6 w-6 text-amber-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-slate-200">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Transactions</p>
                                <p className="text-2xl font-bold text-slate-900 mt-1">
                                    {filteredPayments.length}
                                </p>
                            </div>
                            <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center">
                                <CreditCard className="h-6 w-6 text-slate-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                <div className="flex flex-wrap gap-2 w-full">
                    <div className="relative w-full sm:w-64">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                        <Input
                            placeholder="Search patient, receipt..."
                            className="pl-9 bg-white"
                            value={searchTerm}
                            onChange={(e) => handleSearchChange(e.target.value)}
                        />
                    </div>

                    <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setCurrentPage(1); }}>
                        <SelectTrigger className="w-[140px] bg-white">
                            <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Status</SelectItem>
                            <SelectItem value="PAID">Paid</SelectItem>
                            <SelectItem value="PART">Partial</SelectItem>
                            <SelectItem value="UNPAID">Unpaid</SelectItem>
                        </SelectContent>
                    </Select>

                    <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v); setCurrentPage(1); }}>
                        <SelectTrigger className="w-[150px] bg-white">
                            <SelectValue placeholder="Bill Type" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Types</SelectItem>
                            <SelectItem value="CONSULTATION">Consultation</SelectItem>
                            <SelectItem value="SURGERY">Surgery</SelectItem>
                            <SelectItem value="LAB_TEST">Lab Test</SelectItem>
                            <SelectItem value="FOLLOW_UP">Follow-Up</SelectItem>
                            <SelectItem value="OTHER">Other</SelectItem>
                        </SelectContent>
                    </Select>

                    <Select value={dateRange} onValueChange={(v) => { setDateRange(v); setCurrentPage(1); }}>
                        <SelectTrigger className="w-[140px] bg-white">
                            <SelectValue placeholder="Date Range" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Time</SelectItem>
                            <SelectItem value="today">Today</SelectItem>
                            <SelectItem value="week">This Week</SelectItem>
                            <SelectItem value="month">This Month</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Data Table */}
            <div className="rounded-md border bg-white shadow-sm overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-slate-50/50">
                            <TableHead className="w-[180px]">Patient</TableHead>
                            <TableHead className="w-[100px]">Type</TableHead>
                            <TableHead className="w-[100px]">Bill Date</TableHead>
                            <TableHead className="w-[100px]">Total</TableHead>
                            <TableHead className="w-[100px]">Paid</TableHead>
                            <TableHead className="w-[100px]">Balance</TableHead>
                            <TableHead className="w-[80px]">Status</TableHead>
                            <TableHead className="w-[100px]">Receipt</TableHead>
                            <TableHead className="w-[60px]"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={9} className="h-24 text-center text-muted-foreground">
                                    Loading billing data...
                                </TableCell>
                            </TableRow>
                        ) : paginatedPayments.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={9} className="h-24 text-center text-muted-foreground">
                                    No billing records found.
                                </TableCell>
                            </TableRow>
                        ) : (
                            paginatedPayments.map((payment) => {
                                const balance = payment.totalAmount - payment.amountPaid - payment.discount;
                                const typeCfg = BILL_TYPE_CONFIG[payment.billType] || BILL_TYPE_CONFIG.OTHER;
                                const statusCfg = STATUS_CONFIG[payment.status] || STATUS_CONFIG.UNPAID;

                                return (
                                    <TableRow key={payment.id} className="hover:bg-slate-50/50">
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center">
                                                    <User className="h-4 w-4 text-slate-500" />
                                                </div>
                                                <div>
                                                    <p className="font-medium text-sm">
                                                        {payment.patient?.firstName} {payment.patient?.lastName}
                                                    </p>
                                                    {payment.surgicalCase && (
                                                        <p className="text-xs text-purple-600">
                                                            {payment.surgicalCase.procedureName}
                                                        </p>
                                                    )}
                                                    {payment.appointment && (
                                                        <p className="text-xs text-blue-600">
                                                            Dr. {payment.appointment.doctorName}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge className={cn("text-xs", typeCfg.className)}>
                                                {typeCfg.label}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-sm">
                                            {payment.billDate ? format(new Date(payment.billDate), 'MMM d, yyyy') : '—'}
                                        </TableCell>
                                        <TableCell className="font-semibold">
                                            KES {payment.totalAmount.toLocaleString()}
                                        </TableCell>
                                        <TableCell>
                                            <span className="text-emerald-600 font-medium">
                                                KES {payment.amountPaid.toLocaleString()}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            <span className={cn(
                                                "font-semibold",
                                                balance > 0 ? "text-amber-600" : "text-slate-500"
                                            )}>
                                                KES {balance.toLocaleString()}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            <Badge className={cn("text-xs gap-1", statusCfg.className)}>
                                                {statusCfg.icon}
                                                {statusCfg.label}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <span className="text-xs font-mono text-slate-500">
                                                {payment.receiptNumber || '—'}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => router.push(`/admin/billing/${payment.id}`)}
                                            >
                                                <Eye className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                );
                            })
                        )}
                    </TableBody>
                </Table>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between px-4 py-3 border-t bg-slate-50/50">
                        <div className="text-sm text-muted-foreground">
                            Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, filteredPayments.length)} of {filteredPayments.length} records
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <span className="text-sm font-medium">
                                Page {currentPage} of {totalPages}
                            </span>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                            >
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

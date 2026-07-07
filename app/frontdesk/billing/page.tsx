'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/hooks/patient/useAuth';
import { useRecordPayment } from '@/hooks/frontdesk/useBilling';
import { PaymentMethod } from '@/domain/enums/PaymentMethod';
import { PaymentStatus } from '@/domain/enums/PaymentStatus';
import { BillingSummary } from './components/BillingSummary';
import { SharedPaymentDialog } from '@/components/billing/SharedPaymentDialog';
import { BillingPageHeader } from './components/BillingPageHeader';
import { BillingFilters } from './components/BillingFilters';
import { BillingPaymentTable } from './components/BillingPaymentTable';
import { BillingEmptyState } from './components/BillingEmptyState';
import { BillingPagination } from './components/BillingPagination';
import { apiClient } from '@/lib/api/client';
import type { PaymentWithRelations } from '@/domain/interfaces/repositories/IPaymentRepository';

type StatusFilter = 'all' | PaymentStatus.UNPAID | PaymentStatus.PART | PaymentStatus.PAID;

interface BillingData {
  payments: PaymentWithRelations[];
  summary: {
    totalBilled: number;
    totalCollected: number;
    pendingCount: number;
    paidCount: number;
  };
}

export default function FrontdeskBillingPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const { mutateAsync: recordPayment, isPending: isRecording } = useRecordPayment();

  const [payments, setPayments] = useState<PaymentWithRelations[]>([]);
  const [summary, setSummary] = useState<BillingData['summary'] | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sortField, setSortField] = useState<'date' | 'patient' | 'balance' | 'status'>('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedPayment, setSelectedPayment] = useState<PaymentWithRelations | null>(null);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  
  const pageSize = 10;

  useEffect(() => {
    if (!isAuthenticated) return;
    
    const fetchPayments = async () => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams();
        if (statusFilter !== 'all') {
          params.set('status', statusFilter);
        }
        params.set('limit', '100');
        
        const response = await apiClient.get<BillingData>(
          `/payments/pending?${params.toString()}`
        );
        
        if (response.success) {
          setPayments(response.data.payments);
          setSummary(response.data.summary);
        }
      } catch (error) {
        console.error('Failed to load payments:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchPayments();
  }, [isAuthenticated, statusFilter]);

  const toggleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
    setCurrentPage(1);
  };

  const filteredPayments = useMemo(() => {
    return payments.filter((p) => {
      const matchesSearch = searchQuery
        ? p.patient?.firstName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.patient?.lastName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.chargeSheetNo?.toLowerCase().includes(searchQuery.toLowerCase())
        : true;

      return matchesSearch;
    });
  }, [payments, searchQuery]);

  const sortedPayments = useMemo(() => {
    const data = [...filteredPayments];
    data.sort((a, b) => {
      if (sortField === 'date') {
        const diff = new Date(a.billDate).getTime() - new Date(b.billDate).getTime();
        return sortDir === 'asc' ? diff : -diff;
      }
      if (sortField === 'balance') {
        const aBal = a.totalAmount - a.discount - a.amountPaid;
        const bBal = b.totalAmount - b.discount - b.amountPaid;
        return sortDir === 'asc' ? aBal - bBal : bBal - aBal;
      }
      if (sortField === 'patient') {
        const aName = `${a.patient?.firstName || ''} ${a.patient?.lastName || ''}`.toLowerCase();
        const bName = `${b.patient?.firstName || ''} ${b.patient?.lastName || ''}`.toLowerCase();
        return sortDir === 'asc' ? aName.localeCompare(bName) : bName.localeCompare(aName);
      }
      if (sortField === 'status') {
        return sortDir === 'asc' ? a.status.localeCompare(b.status) : b.status.localeCompare(a.status);
      }
      return 0;
    });
    return data;
  }, [filteredPayments, sortField, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sortedPayments.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedPayments = sortedPayments.slice((safePage - 1) * pageSize, safePage * pageSize);

  const handleCollectPayment = (payment: PaymentWithRelations) => {
    setSelectedPayment(payment);
    setPaymentDialogOpen(true);
  };

  const handleViewPatient = (patientId: string) => {
    router.push(`/frontdesk/patient/${patientId}`);
  };

  const handleRecordPayment = async (amount: number, method: PaymentMethod) => {
    if (!selectedPayment) return;
    await recordPayment({
      paymentId: selectedPayment.id,
      amountPaid: amount,
      paymentMethod: method,
    });
    setPaymentDialogOpen(false);
    setSelectedPayment(null);
  };

  if (!isAuthenticated || !user) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <p className="text-white/70">Please log in to access billing</p>
      </div>
    );
  }

  const hasFilters = !!searchQuery || statusFilter !== 'all';
  const hasPayments = paginatedPayments.length > 0;

  return (
    <div className="max-w-6xl mx-auto space-y-5 animate-in fade-in duration-500">
      <BillingPageHeader />

      <div className="border border-[#e7d6bf] bg-white rounded-xl">
        <div className="px-4 py-3 border-b border-[#e7d6bf]">
          <div className="text-sm font-semibold text-[#2c2e4b] flex items-center gap-2">
            <ReceiptIcon className="h-4 w-4 text-[#caa26a]" />
            Billing Queue
          </div>
        </div>
        <div className="p-4">
          <p className="text-xs text-[#2c2e4b]/60">
            Collect payments and manage charge sheets
          </p>
        </div>
      </div>

      <BillingSummary summary={summary ?? undefined} totalOutstanding={0} />

      {isLoading ? (
        <div className="border border-[#e7d6bf] bg-white rounded-xl overflow-hidden">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 border-b border-[#e7d6bf] last:border-0 animate-pulse bg-[#e7d6bf]/10" />
          ))}
        </div>
      ) : (
        <>
          <BillingFilters
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            statusFilter={statusFilter}
            onStatusChange={setStatusFilter}
            sortField={sortField}
            sortDir={sortDir}
            onToggleSort={toggleSort}
            recordCount={filteredPayments.length}
          />

          {hasPayments ? (
            <>
              <BillingPaymentTable
                payments={paginatedPayments}
                onCollectPayment={handleCollectPayment}
                onViewPatient={handleViewPatient}
              />
              <BillingPagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />
            </>
          ) : (
            <BillingEmptyState hasFilters={hasFilters} onClear={() => {
              setSearchQuery('');
              setStatusFilter('all');
            }} />
          )}
        </>
      )}

      <SharedPaymentDialog
        open={paymentDialogOpen}
        onOpenChange={setPaymentDialogOpen}
        payment={selectedPayment}
        onRecord={handleRecordPayment}
        isRecording={isRecording}
      />
    </div>
  );
}

function ReceiptIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
    </svg>
  );
}
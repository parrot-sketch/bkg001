'use client';

import { Input } from '@/components/ui/input';
import { PaymentStatus, getPaymentStatusLabel } from '@/domain/enums/PaymentStatus';
import { cn } from '@/lib/utils';

type SortField = 'date' | 'patient' | 'balance' | 'status';
type StatusFilter = 'all' | PaymentStatus.UNPAID | PaymentStatus.PART | PaymentStatus.PAID;

interface BillingFiltersProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  statusFilter: StatusFilter;
  onStatusChange: (value: StatusFilter) => void;
  sortField: SortField;
  sortDir: 'asc' | 'desc';
  onToggleSort: (field: SortField) => void;
  recordCount: number;
}

export function BillingFilters({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusChange,
  sortField,
  sortDir,
  onToggleSort,
  recordCount,
}: BillingFiltersProps) {
  const statusTabs = ['all', PaymentStatus.UNPAID, PaymentStatus.PART, PaymentStatus.PAID] as const;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-1 bg-white border border-[#e7d6bf] rounded-xl p-1.5 w-fit">
        {statusTabs.map((status) => {
          const isActive = statusFilter === status;
          return (
            <button
              key={status}
              onClick={() => onStatusChange(status)}
              className={cn(
                "px-4 py-2 text-sm font-medium transition-all rounded-lg",
                isActive
                  ? "bg-[#2c2e4b] text-white shadow-sm"
                  : "text-[#2c2e4b]/70 hover:text-[#2c2e4b] hover:bg-[#e7d6bf]/30"
              )}
            >
              {status === 'all' ? 'All' : getPaymentStatusLabel(status)}
            </button>
          );
        })}
        <span className="ml-2 text-xs text-[#2c2e4b]/60 tabular-nums px-2 py-1">
          {recordCount} {recordCount === 1 ? 'record' : 'records'}
        </span>
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#2c2e4b]/40" />
          <Input
            placeholder="Search patient, charge sheet..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9 h-9 bg-white border-[#e7d6bf] rounded-lg text-sm text-[#2c2e4b]"
          />
        </div>
        <div className="flex items-center gap-1">
          {[
            { field: 'date' as SortField, label: 'Date' },
            { field: 'patient' as SortField, label: 'Patient' },
            { field: 'balance' as SortField, label: 'Balance' },
            { field: 'status' as SortField, label: 'Status' },
          ].map((item) => {
            const isActive = sortField === item.field;
            return (
              <button
                key={item.field}
                onClick={() => onToggleSort(item.field)}
                className={cn(
                  'px-2.5 py-1.5 text-[11px] font-medium rounded-lg border transition-colors',
                  isActive
                    ? 'border-[#caa26a] bg-[#e7d6bf]/30 text-[#2c2e4b]'
                    : 'border-[#e7d6bf] text-[#2c2e4b]/60 hover:text-[#2c2e4b] hover:bg-[#e7d6bf]/20',
                )}
              >
                {item.label}
                {isActive && (
                  <span className="ml-1 text-[#caa26a]">{sortDir === 'asc' ? '↑' : '↓'}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function SearchIcon({ className }: { className?: string }) {
  return <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>;
}
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { formatDistanceToNow } from 'date-fns';
import type { QueuePatient } from '@/hooks/doctor/useDoctorQueue';

interface QueuePatientsViewProps {
  queue: QueuePatient[];
  isLoading: boolean;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  sortBy: string;
  sortOrder: string;
  onSortByChange: (sortBy: string) => void;
  onSortOrderToggle: () => void;
  onOpenPatient: (appointmentId: number, status: string) => void;
  onNewConsultation: (patientId: string) => void;
}

type DateFilter = 'today' | 'week' | 'month' | 'all' | 'custom';

export function QueuePatientsView({
  queue,
  isLoading,
  searchQuery,
  onSearchChange,
  sortBy,
  sortOrder,
  onSortByChange,
  onSortOrderToggle,
  onOpenPatient,
  onNewConsultation,
}: QueuePatientsViewProps) {
  const [queueStartDate, setQueueStartDate] = useState('');
  const [queueEndDate, setQueueEndDate] = useState('');
  const [queueDateFilter, setQueueDateFilter] = useState<DateFilter>('all');

  const handleQuickFilter = (filter: DateFilter) => {
    setQueueDateFilter(filter);
    const now = new Date();
    switch (filter) {
      case 'today':
        setQueueStartDate(format(now, 'yyyy-MM-dd'));
        setQueueEndDate(format(now, 'yyyy-MM-dd'));
        break;
      case 'week': {
        const start = startOfWeek(now, { weekStartsOn: 1 });
        const end = endOfWeek(now, { weekStartsOn: 1 });
        setQueueStartDate(format(start, 'yyyy-MM-dd'));
        setQueueEndDate(format(end, 'yyyy-MM-dd'));
        break;
      }
      case 'month': {
        const start = startOfMonth(now);
        const end = endOfMonth(now);
        setQueueStartDate(format(start, 'yyyy-MM-dd'));
        setQueueEndDate(format(end, 'yyyy-MM-dd'));
        break;
      }
      case 'all':
      default:
        setQueueStartDate('');
        setQueueEndDate('');
        break;
    }
  };

  const clearFilters = () => {
    setQueueStartDate('');
    setQueueEndDate('');
    setQueueDateFilter('all');
    onSearchChange('');
  };

  const hasActiveFilters = queueStartDate || queueEndDate || searchQuery;

  return (
    <>
      {/* Date filter bar */}
      <div className="flex flex-wrap items-center gap-2 bg-white border border-[#e7d6bf] rounded-xl p-3">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-[#2c2e4b]/60">Date added</span>
        <div className="flex items-center gap-1">
          {([
            { key: 'today', label: 'Today' },
            { key: 'week', label: 'This Week' },
            { key: 'month', label: 'This Month' },
            { key: 'all', label: 'All' },
          ] as const).map((item) => (
            <Button
              key={item.key}
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => handleQuickFilter(item.key)}
              className={`h-7 px-2.5 text-[11px] rounded-md border ${
                queueDateFilter === item.key
                  ? 'border-[#caa26a] bg-[#caa26a]/10 text-[#2c2e4b]'
                  : 'border-[#e7d6bf] text-[#2c2e4b]/70 hover:bg-[#e7d6bf]/20'
              }`}
            >
              {item.label}
            </Button>
          ))}
        </div>
        <div className="flex items-center gap-1">
          <input
            type="date"
            value={queueStartDate}
            onChange={(e) => {
              setQueueStartDate(e.target.value);
              setQueueDateFilter('custom');
            }}
            className="h-7 px-2 text-[11px] rounded-md border border-[#e7d6bf] bg-white text-[#2c2e4b] focus:outline-none focus:ring-1 focus:ring-[#caa26a]/40"
          />
          <span className="text-[11px] text-[#2c2e4b]/50">to</span>
          <input
            type="date"
            value={queueEndDate}
            onChange={(e) => {
              setQueueEndDate(e.target.value);
              setQueueDateFilter('custom');
            }}
            className="h-7 px-2 text-[11px] rounded-md border border-[#e7d6bf] bg-white text-[#2c2e4b] focus:outline-none focus:ring-1 focus:ring-[#caa26a]/40"
          />
        </div>
      </div>

      {/* Loading state */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-4 p-4 bg-white border border-[#e7d6bf] rounded-lg">
              <div className="h-9 w-9 rounded-lg bg-[#e7d6bf]/30 animate-pulse" />
              <div className="flex-1 space-y-1.5">
                <div className="h-4 w-44 bg-[#e7d6bf]/30 rounded animate-pulse" />
                <div className="h-3 w-28 bg-[#e7d6bf]/30 rounded animate-pulse" />
              </div>
              <div className="h-8 w-20 bg-[#e7d6bf]/30 rounded-lg animate-pulse" />
            </div>
          ))}
        </div>
      ) : queue.length === 0 ? (
      <div className="flex flex-col items-center justify-center py-16 bg-white border border-[#e7d6bf] rounded-xl">
        <h3 className="text-sm font-semibold text-[#2c2e4b]">
          {hasActiveFilters ? 'No patients match your filters' : 'No patients in queue'}
        </h3>
        <p className="text-xs text-[#2c2e4b]/70 max-w-xs text-center mt-1">
          {queueStartDate || queueEndDate
            ? 'Try widening the date range or clearing the date filter.'
            : searchQuery
              ? 'Try a different name, file number, or phone number.'
              : 'Patients added to your queue will appear here until you start their consultation.'}
        </p>
          {hasActiveFilters && (
            <Button
              variant="outline"
              size="sm"
              className="mt-4 rounded-lg border-[#e7d6bf] text-[#2c2e4b]"
              onClick={clearFilters}
            >
              Clear filters
            </Button>
          )}
        </div>
      ) : (
        <div className="border border-[#e7d6bf] bg-white overflow-hidden rounded-xl">
          <div className="hidden md:grid grid-cols-12 gap-4 px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-[#2c2e4b]/60 border-b border-[#e7d6bf]">
            <div className="col-span-4">Patient</div>
            <div className="col-span-2">File</div>
            <div className="col-span-2">Wait</div>
            <div className="col-span-2">Status</div>
            <div className="col-span-2">Flags</div>
            <div className="col-span-1">Actions</div>
          </div>
          <div className="divide-y divide-[#e7d6bf]">
            {queue.map((entry) => {
              const patient = entry.patient;
              const queueStatus = entry.status === 'IN_CONSULTATION' ? 'In Progress' : 'Pending';
              const appointmentId = entry.appointmentId;
              const waitTime = entry.addedAt
                ? formatDistanceToNow(new Date(entry.addedAt), { addSuffix: true })
                : '—';

              return (
                <div
                  key={entry.id}
                  className="flex items-center gap-4 px-4 py-3 hover:bg-[#e7d6bf]/10 transition-colors"
                >
                  <Link href={`/doctor/patients/${patient.id}`} className="flex-1 min-w-0 flex items-center gap-3">
                    <div className="h-9 w-9 border border-[#e7d6bf] bg-[#e7d6bf]/30 flex items-center justify-center text-xs font-semibold text-[#2c2e4b] flex-shrink-0 rounded-lg">
                      {`${patient.firstName?.[0] || ''}${patient.lastName?.[0] || ''}`.toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-[#2c2e4b] truncate">{`${patient.firstName} ${patient.lastName}`}</div>
                      <div className="md:hidden text-xs text-[#2c2e4b]/60 mt-0.5">
                        {patient.fileNumber || '—'} · {(patient as any).phone || '—'}
                      </div>
                    </div>
                  </Link>
                  <div className="hidden md:block text-sm text-[#2c2e4b]">
                    {patient.fileNumber || '—'}
                  </div>
                  <div className="hidden md:block text-sm text-[#2c2e4b]">
                    {waitTime}
                  </div>
                  <div className="hidden md:block">
                    <Badge
                      variant="outline"
                      className={`text-[10px] font-medium border-0 ${
                        queueStatus === 'In Progress'
                          ? 'bg-violet-50 text-violet-700'
                          : 'bg-amber-50 text-amber-700'
                      }`}
                    >
                      {queueStatus}
                    </Badge>
                  </div>
                  <div className="hidden md:flex flex-wrap gap-1">
                    {(patient as any).allergies?.trim() && (
                      <Badge variant="outline" className="text-[10px] font-medium bg-rose-50 text-rose-700 border-rose-200">
                        Allergies
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                    {appointmentId ? (
                      <Button
                        size="sm"
                        onClick={() => onOpenPatient(appointmentId, queueStatus)}
                        className={`h-8 px-3 text-xs rounded-lg ${
                          queueStatus === 'In Progress'
                            ? 'bg-violet-600 hover:bg-violet-700 text-white'
                            : 'bg-[#2c2e4b] hover:bg-[#1a1c2f] text-white'
                        }`}
                      >
                        {queueStatus === 'In Progress' ? 'Continue' : 'Open'}
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => onNewConsultation(patient.id)}
                        className="h-8 px-3 text-xs rounded-lg bg-[#2c2e4b] hover:bg-[#1a1c2f] text-white"
                      >
                        New
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}

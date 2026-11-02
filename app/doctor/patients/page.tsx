'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/patient/useAuth';
import { useDoctorPatients } from '@/hooks/doctor/useDoctorPatients';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Search, X } from 'lucide-react';
import { DoctorPatientsTable } from './components/DoctorPatientsTable';

const PAGE_SIZE = 20;

export default function DoctorPatientsPage() {
  const { user, isAuthenticated } = useAuth();
  const [draft, setDraft] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    const timer = setTimeout(() => setSearchQuery(draft.trim()), 300);
    return () => clearTimeout(timer);
  }, [draft]);

  useEffect(() => {
    setPage(1);
  }, [searchQuery]);

  const {
    data: patientsData,
    isLoading,
    isFetching,
    error: patientsError,
    refetch,
  } = useDoctorPatients(!!user && isAuthenticated, {
    status: 'ACTIVE',
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
    search: searchQuery,
    sortBy: 'name',
    sortOrder: 'asc',
  });

  const patients = patientsData?.patients ?? [];
  const total = patientsData?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const start = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const end = Math.min(page * PAGE_SIZE, total);

  if (!isAuthenticated || !user) {
    return <div className="bg-white px-6 py-10 text-sm text-[#2c2e4b]/60">Loading your patients…</div>;
  }

  return (
    <div className="bg-white text-[#2c2e4b]">
      <header className="bg-[#2c2e4b] px-4 py-4 text-white sm:px-6">
        <div className="flex items-baseline justify-between gap-3">
          <h1 className="text-lg font-semibold">My patients</h1>
          <p className="text-sm text-white/70 tabular-nums">
            {isLoading ? '…' : `${total} on your list`}
          </p>
        </div>
        <div className="relative mt-3">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/50" />
          <input
            type="search"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Name, file number, or phone"
            aria-label="Search patients"
            className="h-12 w-full border border-white/25 bg-white/10 pl-10 pr-12 text-base text-white placeholder:text-white/50 focus:border-[#caa26a] focus:outline-none [&::-webkit-search-cancel-button]:appearance-none"
          />
          {draft && (
            <button
              type="button"
              onClick={() => setDraft('')}
              aria-label="Clear search"
              className="absolute right-1 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center text-white/70 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </header>

      {patientsError ? (
        <div className="px-4 py-16 text-center sm:px-6">
          <p className="text-sm font-semibold">Unable to load your patients</p>
          <Button
            variant="outline"
            className="mt-4 h-11 rounded-none border-[#2c2e4b] px-5 text-[#2c2e4b]"
            onClick={() => refetch()}
          >
            Retry
          </Button>
        </div>
      ) : (
        <DoctorPatientsTable
          patients={patients}
          isLoading={isLoading}
          isUpdating={isFetching && !isLoading}
          hasSearch={searchQuery.length > 0}
        />
      )}

      {total > PAGE_SIZE && (
        <div className="flex items-center justify-between gap-3 border-t border-[#e7d6bf] px-4 py-3 sm:px-6">
          <span className="text-sm text-[#2c2e4b]/70 tabular-nums">
            {start}–{end} of {total}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              className="h-11 rounded-none border-[#2c2e4b]/20 px-3 text-[#2c2e4b]"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={page <= 1 || isFetching}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <Button
              variant="outline"
              className="h-11 rounded-none border-[#2c2e4b]/20 px-3 text-[#2c2e4b]"
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
              disabled={page >= totalPages || isFetching}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

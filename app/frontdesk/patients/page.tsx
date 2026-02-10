'use client';

/**
 * Frontdesk Patients Page — Premium Redesign
 * 
 * Patient registry with:
 *   - Pipeline stats (Total, New Today, New This Month)
 *   - Full-text search with debounced URL sync
 *   - Clean table with clickable rows, refined pagination
 *   - Responsive card fallback on mobile
 *   - Skeleton loading + beautiful empty state
 *   - Design language consistent with Appointments page
 */

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useFrontdeskPatients } from '@/hooks/frontdesk/useFrontdeskPatients';
import { ProfileImage } from '@/components/profile-image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Users,
  UserPlus,
  Search,
  Eye,
  Calendar,
  Phone,
  Mail,
  Clock,
  ChevronLeft,
  ChevronRight,
  Loader2,
  UserCheck,
  TrendingUp,
  ArrowRight,
} from 'lucide-react';
import { format } from 'date-fns';
import { calculateAge } from '@/lib/utils';
import { cn } from '@/lib/utils';
import Link from 'next/link';

/* ═══════════════════ Sub Components ═══════════════════ */

function StatCard({
  title,
  value,
  icon: Icon,
  color,
  loading = false,
}: {
  title: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  color: 'slate' | 'cyan' | 'emerald' | 'amber';
  loading?: boolean;
}) {
  const colorClasses: Record<string, { bg: string; icon: string }> = {
    slate: { bg: 'bg-slate-100', icon: 'text-slate-600' },
    cyan: { bg: 'bg-cyan-100', icon: 'text-cyan-600' },
    emerald: { bg: 'bg-emerald-100', icon: 'text-emerald-600' },
    amber: { bg: 'bg-amber-100', icon: 'text-amber-600' },
  };
  const styles = colorClasses[color];

  return (
    <div className="flex items-center gap-3 p-3.5 rounded-xl bg-white border border-slate-100 shadow-sm">
      <div className={cn('p-2 rounded-lg', styles.bg)}>
        <Icon className={cn('h-4 w-4', styles.icon)} />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wide font-medium text-slate-400">{title}</p>
        {loading ? (
          <Skeleton className="h-6 w-10 mt-0.5" />
        ) : (
          <p className="text-xl font-bold text-slate-800">{value.toLocaleString()}</p>
        )}
      </div>
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="space-y-1">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-5 py-4 animate-pulse">
          <Skeleton className="h-10 w-10 rounded-full flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="h-4 w-20 hidden md:block" />
          <Skeleton className="h-4 w-32 hidden md:block" />
          <Skeleton className="h-4 w-24 hidden lg:block" />
          <Skeleton className="h-8 w-16 rounded-lg" />
        </div>
      ))}
    </div>
  );
}

function EmptyState({ hasSearch, onClear }: { hasSearch: boolean; onClear: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6">
      <div className="h-16 w-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-5">
        <Users className="h-8 w-8 text-slate-300" />
      </div>
      <h3 className="text-base font-semibold text-slate-700 mb-1">
        {hasSearch ? 'No patients found' : 'No patients registered yet'}
      </h3>
      <p className="text-sm text-slate-400 text-center max-w-xs mb-5">
        {hasSearch
          ? 'Try adjusting your search query or clearing the filter.'
          : 'Start by registering your first patient to populate the registry.'}
      </p>
      {hasSearch ? (
        <Button
          variant="outline"
          size="sm"
          onClick={onClear}
          className="rounded-xl text-slate-600"
        >
          Clear Search
        </Button>
      ) : (
        <Link href="/frontdesk/patient-intake">
          <Button size="sm" className="bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl shadow-sm shadow-cyan-200/50">
            <UserPlus className="h-4 w-4 mr-2" />
            Register First Patient
          </Button>
        </Link>
      )}
    </div>
  );
}

/* ═══════════════════ Main Content ═══════════════════ */

function FrontdeskPatientsContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // URL-driven state
  const page = Number(searchParams.get('page')) || 1;
  const limit = 12;
  const urlSearch = searchParams.get('q') || '';

  // Local state for immediate input feedback
  const [searchInput, setSearchInput] = useState(urlSearch);

  // Debounce: sync search input → URL after 400ms
  useEffect(() => {
    if (searchInput === urlSearch) return;

    const timer = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      params.set('page', '1');
      if (searchInput) {
        params.set('q', searchInput);
      } else {
        params.delete('q');
      }
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    }, 400);

    return () => clearTimeout(timer);
  }, [searchInput, urlSearch, searchParams, pathname, router]);

  // Page navigation
  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    if (newPage > 1) {
      params.set('page', newPage.toString());
    } else {
      params.delete('page');
    }
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  // Data fetching
  const { data: apiResponse, isLoading, isRefetching } = useFrontdeskPatients({
    page,
    limit,
    search: urlSearch,
  });

  const patients = apiResponse?.success ? apiResponse.data : [];
  const meta = apiResponse?.success && apiResponse.meta
    ? apiResponse.meta
    : { totalRecords: 0, totalPages: 1, currentPage: 1, limit: 12, newToday: 0, newThisMonth: 0 };

  // Pagination helpers
  const startRecord = patients.length > 0 ? (page - 1) * limit + 1 : 0;
  const endRecord = Math.min(page * limit, meta.totalRecords);

  return (
    <div className="space-y-5 animate-in fade-in duration-500">
      {/* ═══ Page Header ═══ */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Patient Registry</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Search, view, and manage all registered patients
          </p>
        </div>
        <Link href="/frontdesk/patient-intake">
          <Button className="bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl shadow-sm shadow-cyan-200/50 h-10 px-5 w-full sm:w-auto">
            <UserPlus className="h-4 w-4 mr-2" />
            Register Patient
          </Button>
        </Link>
      </header>

      {/* ═══ Stats Row ═══ */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          title="Total Patients"
          value={meta.totalRecords}
          icon={Users}
          color="slate"
          loading={isLoading}
        />
        <StatCard
          title="New Today"
          value={meta.newToday ?? 0}
          icon={UserPlus}
          color="cyan"
          loading={isLoading}
        />
        <StatCard
          title="This Month"
          value={meta.newThisMonth ?? 0}
          icon={TrendingUp}
          color="emerald"
          loading={isLoading}
        />
        <StatCard
          title="Showing"
          value={patients.length}
          icon={UserCheck}
          color="amber"
          loading={isLoading}
        />
      </section>

      {/* ═══ Controls Bar ═══ */}
      <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300" />
            <Input
              placeholder="Search by name, file number, phone, or email..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-10 h-10 rounded-xl border-slate-200 bg-slate-50/50 focus:bg-white transition-colors"
            />
            {searchInput && (
              <button
                onClick={() => setSearchInput('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500 text-lg leading-none"
              >
                ×
              </button>
            )}
          </div>

          {/* Refetch indicator */}
          {isRefetching && (
            <div className="flex items-center gap-1.5 text-xs text-slate-400 shrink-0">
              <Loader2 className="h-3 w-3 animate-spin" />
              Refreshing...
            </div>
          )}

          {/* Record count */}
          {!isLoading && meta.totalRecords > 0 && (
            <p className="text-xs text-slate-400 shrink-0 hidden sm:block">
              {startRecord}–{endRecord} of {meta.totalRecords.toLocaleString()}
            </p>
          )}
        </div>
      </div>

      {/* ═══ Patient Table ═══ */}
      <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
        {isLoading ? (
          <TableSkeleton />
        ) : patients.length === 0 ? (
          <EmptyState
            hasSearch={!!urlSearch}
            onClear={() => setSearchInput('')}
          />
        ) : (
          <>
            {/* Desktop Table (≥768px) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-400 w-[280px]">
                      Patient
                    </th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-400 w-[120px]">
                      File No.
                    </th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-400 w-[200px]">
                      Contact
                    </th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-400 w-[140px] hidden lg:table-cell">
                      Last Visit
                    </th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-400 w-[120px] hidden xl:table-cell">
                      Registered
                    </th>
                    <th className="px-5 py-3 text-right text-xs font-semibold text-slate-400 w-[140px]">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {patients.map((patient: any) => {
                    const patientName = `${patient.firstName} ${patient.lastName}`;
                    const lastVisit = patient.lastVisit;

                    return (
                      <tr
                        key={patient.id}
                        className="group hover:bg-slate-50/60 transition-colors duration-150 cursor-pointer"
                        onClick={() => router.push(`/frontdesk/patient/${patient.id}`)}
                      >
                        {/* Patient */}
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <ProfileImage
                              url={patient.profileImage}
                              name={patientName}
                              bgColor={patient.colorCode}
                              className="h-10 w-10"
                              textClassName="text-white text-sm font-semibold"
                            />
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-slate-800 truncate group-hover:text-cyan-700 transition-colors">
                                {patientName}
                              </p>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="text-xs text-slate-400 capitalize">
                                  {patient.gender?.toLowerCase()}
                                </span>
                                <span className="text-slate-200">·</span>
                                <span className="text-xs text-slate-400">
                                  {patient.dateOfBirth ? `${calculateAge(patient.dateOfBirth)} yrs` : 'N/A'}
                                </span>
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* File Number */}
                        <td className="px-5 py-3.5">
                          <span className="inline-flex items-center font-mono text-xs font-semibold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-md">
                            {patient.fileNumber || '—'}
                          </span>
                        </td>

                        {/* Contact */}
                        <td className="px-5 py-3.5">
                          <div className="space-y-1">
                            {patient.phone && (
                              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                <Phone className="h-3 w-3 text-slate-300 flex-shrink-0" />
                                <span className="truncate max-w-[160px]">{patient.phone}</span>
                              </div>
                            )}
                            {patient.email && (
                              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                <Mail className="h-3 w-3 text-slate-300 flex-shrink-0" />
                                <span className="truncate max-w-[160px]">{patient.email}</span>
                              </div>
                            )}
                            {!patient.phone && !patient.email && (
                              <span className="text-xs text-slate-300 italic">No contact</span>
                            )}
                          </div>
                        </td>

                        {/* Last Visit */}
                        <td className="px-5 py-3.5 hidden lg:table-cell">
                          {lastVisit ? (
                            <div className="flex items-center gap-1.5 text-xs text-slate-500">
                              <Clock className="h-3 w-3 text-slate-300" />
                              {format(new Date(lastVisit), 'MMM d, yyyy')}
                            </div>
                          ) : (
                            <span className="text-xs text-slate-300 italic">No visits</span>
                          )}
                        </td>

                        {/* Registered */}
                        <td className="px-5 py-3.5 hidden xl:table-cell">
                          {patient.createdAt ? (
                            <span className="text-xs text-slate-400">
                              {format(new Date(patient.createdAt), 'MMM d, yyyy')}
                            </span>
                          ) : (
                            <span className="text-xs text-slate-300">—</span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="px-5 py-3.5">
                          <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                            <Link href={`/frontdesk/patient/${patient.id}`}>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 px-2.5 text-xs rounded-lg text-slate-500 hover:text-cyan-700 hover:bg-cyan-50"
                              >
                                <Eye className="h-3.5 w-3.5 mr-1" />
                                View
                              </Button>
                            </Link>
                            <Link href={`/frontdesk/appointments/new?patientId=${patient.id}`}>
                              <Button
                                size="sm"
                                className="h-8 px-2.5 text-xs rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white shadow-sm shadow-cyan-200/30"
                              >
                                <Calendar className="h-3.5 w-3.5 mr-1" />
                                Book
                              </Button>
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards (<768px) */}
            <div className="md:hidden divide-y divide-slate-100">
              {patients.map((patient: any) => {
                const patientName = `${patient.firstName} ${patient.lastName}`;
                const lastVisit = patient.lastVisit;

                return (
                  <Link
                    key={patient.id}
                    href={`/frontdesk/patient/${patient.id}`}
                    className="block"
                  >
                    <div className="p-4 hover:bg-slate-50/60 transition-colors active:bg-slate-100/60">
                      <div className="flex items-start gap-3">
                        <ProfileImage
                          url={patient.profileImage}
                          name={patientName}
                          bgColor={patient.colorCode}
                          className="h-11 w-11"
                          textClassName="text-white text-sm font-semibold"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-slate-800 truncate">{patientName}</p>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="text-xs text-slate-400 capitalize">
                                  {patient.gender?.toLowerCase()}
                                </span>
                                <span className="text-slate-200">·</span>
                                <span className="text-xs text-slate-400">
                                  {patient.dateOfBirth ? `${calculateAge(patient.dateOfBirth)} yrs` : 'N/A'}
                                </span>
                              </div>
                            </div>
                            {patient.fileNumber && (
                              <span className="font-mono text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded shrink-0">
                                {patient.fileNumber}
                              </span>
                            )}
                          </div>

                          <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1">
                            {patient.phone && (
                              <div className="flex items-center gap-1 text-xs text-slate-400">
                                <Phone className="h-3 w-3" />
                                <span>{patient.phone}</span>
                              </div>
                            )}
                            {lastVisit && (
                              <div className="flex items-center gap-1 text-xs text-slate-400">
                                <Clock className="h-3 w-3" />
                                <span>{format(new Date(lastVisit), 'MMM d')}</span>
                              </div>
                            )}
                          </div>

                          {/* Quick actions */}
                          <div className="mt-3 flex gap-2" onClick={(e) => e.preventDefault()}>
                            <Link href={`/frontdesk/appointments/new?patientId=${patient.id}`} className="flex-1">
                              <Button
                                size="sm"
                                className="w-full h-8 text-xs rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white"
                              >
                                <Calendar className="h-3 w-3 mr-1" />
                                Book Appointment
                              </Button>
                            </Link>
                            <Link href={`/frontdesk/patient/${patient.id}`}>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 text-xs rounded-lg text-slate-500"
                              >
                                <ArrowRight className="h-3 w-3" />
                              </Button>
                            </Link>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* ═══ Pagination ═══ */}
      {!isLoading && meta.totalPages > 1 && (
        <div className="flex items-center justify-between px-1">
          <p className="text-xs text-slate-400">
            Showing <span className="font-semibold text-slate-600">{startRecord}–{endRecord}</span> of{' '}
            <span className="font-semibold text-slate-600">{meta.totalRecords.toLocaleString()}</span> patients
          </p>

          <div className="flex items-center gap-1.5">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-lg text-slate-500 hover:text-slate-700"
              onClick={() => handlePageChange(Math.max(1, page - 1))}
              disabled={page <= 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            {/* Page numbers */}
            {generatePageNumbers(page, meta.totalPages).map((p, idx) =>
              p === '...' ? (
                <span key={`dots-${idx}`} className="px-1 text-xs text-slate-300">
                  …
                </span>
              ) : (
                <button
                  key={p}
                  onClick={() => handlePageChange(p as number)}
                  className={cn(
                    'h-8 w-8 rounded-lg text-xs font-semibold transition-all',
                    page === p
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
                  )}
                >
                  {p}
                </button>
              )
            )}

            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-lg text-slate-500 hover:text-slate-700"
              onClick={() => handlePageChange(Math.min(meta.totalPages, page + 1))}
              disabled={page >= meta.totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════ Pagination Helpers ═══════════════════ */

function generatePageNumbers(current: number, total: number): (number | '...')[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const pages: (number | '...')[] = [1];

  if (current > 3) pages.push('...');

  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);

  for (let i = start; i <= end; i++) {
    pages.push(i);
  }

  if (current < total - 2) pages.push('...');
  pages.push(total);

  return pages;
}

/* ═══════════════════ Page Export ═══════════════════ */

export default function FrontdeskPatientsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-[60vh]">
          <div className="text-center space-y-3">
            <Loader2 className="h-8 w-8 animate-spin text-slate-300 mx-auto" />
            <p className="text-sm text-slate-400">Loading patient registry...</p>
          </div>
        </div>
      }
    >
      <FrontdeskPatientsContent />
    </Suspense>
  );
}

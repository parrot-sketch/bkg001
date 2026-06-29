'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { useFrontdeskPatients } from '@/hooks/frontdesk/useFrontdeskPatients';
import { usePatientStats } from '@/hooks/frontdesk/usePatientStats';
import { ProfileImage } from '@/components/profile-image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Search,
  Calendar,
  Phone,
  Clock,
  ChevronLeft,
  ChevronRight,
  Loader2,
  UserPlus,
} from 'lucide-react';
import { format } from 'date-fns';
import { calculateAge } from '@/lib/utils';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { useBookAppointmentStore } from '@/hooks/frontdesk/useBookAppointmentStore';
import { BookingChannel } from '@/domain/enums/BookingChannel';
import { AppointmentSource } from '@/domain/enums/AppointmentSource';
import { PatientTableActions } from '@/components/frontdesk/PatientTableActions';
import { PatientStatusIndicator, getPatientStatus } from '@/components/frontdesk/PatientStatusIndicator';
import { PatientRegistrationDialog } from '@/components/frontdesk/PatientRegistrationDialog';
import type { PatientRegistryDto } from '@/application/dtos/PatientRegistryDto';

/* ═══════════════════ Stat Card ═══════════════════ */

function StatCard({
  title,
  value,
  loading = false,
  onClick,
}: {
  title: string;
  value: number;
  loading?: boolean;
  onClick?: () => void;
}) {
  return (
    <Card
      onClick={onClick}
      className={cn(
        'border border-slate-200 bg-white shadow-sm transition-all hover:shadow-md',
        onClick ? 'cursor-pointer' : ''
      )}
    >
      <CardContent className="p-4">
        <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">{title}</p>
        {loading ? (
          <div className="h-7 w-12 bg-slate-100 rounded animate-pulse mt-2" />
        ) : (
          <p className="text-xl font-semibold text-[#121c1d] tracking-tight mt-1">{value.toLocaleString()}</p>
        )}
      </CardContent>
    </Card>
  );
}

/* ═══════════════════ Skeletons ═══════════════════ */

function TableSkeleton() {
  return (
    <div className="space-y-1">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-5 py-4 border-b border-slate-100">
          <Skeleton className="h-10 w-10 rounded-full flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="h-4 w-20 hidden md:block" />
          <Skeleton className="h-4 w-32 hidden lg:block" />
          <Skeleton className="h-4 w-24 hidden lg:block" />
          <Skeleton className="h-8 w-8 rounded-lg" />
        </div>
      ))}
    </div>
  );
}

function EmptyState({ hasSearch, onClear, onRegister }: { hasSearch: boolean; onClear: () => void; onRegister: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6">
      <div className="h-14 w-14 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center mb-4">
        <Search className="h-6 w-6 text-slate-300" />
      </div>
      <h3 className="text-sm font-semibold text-[#121c1d] mb-1">
        {hasSearch ? 'No patients found' : 'No patients registered yet'}
      </h3>
      <p className="text-xs text-slate-400 text-center max-w-xs mb-5">
        {hasSearch
          ? 'Try adjusting your search query or clearing the filter.'
          : 'Start by registering your first patient to populate the registry.'}
      </p>
      {hasSearch ? (
        <Button variant="outline" size="sm" onClick={onClear} className="rounded-lg">
          Clear Search
        </Button>
      ) : (
        <Button size="sm" onClick={onRegister} className="bg-[#0c5d69] hover:bg-[#0a4f59] text-white rounded-lg">
          <UserPlus className="h-4 w-4 mr-1.5" />
          Register First Patient
        </Button>
      )}
    </div>
  );
}

/* ═══════════════════ Main Content ═══════════════════ */

function FrontdeskPatientsContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { openBookingDialog } = useBookAppointmentStore();
  const [registrationOpen, setRegistrationOpen] = useState(false);

  const page = Number(searchParams.get('page')) || 1;
  const limit = 12;
  const urlSearch = searchParams.get('q') || '';
  const createdToday = searchParams.get('createdToday') === 'true';
  const createdThisMonth = searchParams.get('createdThisMonth') === 'true';
  const isSelectionMode = searchParams.get('mode') === 'book';

  const highlightId = searchParams.get('highlight') || '';
  const [activeHighlight, setActiveHighlight] = useState(highlightId);

  useEffect(() => {
    if (!highlightId) return;
    setActiveHighlight(highlightId);
    const timer = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      params.delete('highlight');
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
      setActiveHighlight('');
    }, 3000);
    return () => clearTimeout(timer);
  }, [highlightId]);

  const [searchInput, setSearchInput] = useState(urlSearch);

  useEffect(() => {
    if (searchInput === urlSearch) return;
    const timer = setTimeout(() => {
      if (searchInput.trim().length === 1) return;
      const params = new URLSearchParams(searchParams.toString());
      params.set('page', '1');
      if (searchInput) {
        params.set('q', searchInput.trim());
      } else {
        params.delete('q');
      }
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput, urlSearch, searchParams, pathname, router]);

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    if (newPage > 1) {
      params.set('page', newPage.toString());
    } else {
      params.delete('page');
    }
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const { data: listResult, isLoading, isRefetching } = useFrontdeskPatients({
    page,
    limit,
    search: urlSearch,
    createdToday,
    createdThisMonth,
    enabled: true,
  });

  const { data: stats, isLoading: isStatsLoading } = usePatientStats();

  const patients: PatientRegistryDto[] = listResult?.data ?? [];
  const meta = listResult?.meta ?? { totalRecords: 0, totalPages: 1, currentPage: 1, limit: 12 };

  const startRecord = patients.length > 0 ? (page - 1) * limit + 1 : 0;
  const endRecord = Math.min(page * limit, meta.totalRecords);

  return (
    <div className="space-y-5 animate-in fade-in duration-500">
      {/* Stats Row */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          title="Total Patients"
          value={stats?.totalRecords ?? 0}
          loading={isStatsLoading}
          onClick={() => {
            setSearchInput('');
            const params = new URLSearchParams(searchParams.toString());
            params.delete('q');
            params.delete('createdToday');
            params.delete('createdThisMonth');
            params.set('page', '1');
            router.push(`${pathname}?${params.toString()}`, { scroll: false });
          }}
        />
        <StatCard
          title="New Today"
          value={stats?.newToday ?? 0}
          loading={isStatsLoading}
          onClick={() => {
            setSearchInput('');
            const params = new URLSearchParams(searchParams.toString());
            params.delete('q');
            params.set('createdToday', 'true');
            params.delete('createdThisMonth');
            params.set('page', '1');
            router.push(`${pathname}?${params.toString()}`, { scroll: false });
          }}
        />
        <StatCard
          title="This Month"
          value={stats?.newThisMonth ?? 0}
          loading={isStatsLoading}
          onClick={() => {
            setSearchInput('');
            const params = new URLSearchParams(searchParams.toString());
            params.delete('q');
            params.delete('createdToday');
            params.set('createdThisMonth', 'true');
            params.set('page', '1');
            router.push(`${pathname}?${params.toString()}`, { scroll: false });
          }}
        />
        <StatCard
          title="Showing"
          value={patients.length}
          loading={isLoading}
        />
      </section>

      {/* Main Card (Header + Table) */}
      <Card className={cn("border border-slate-200 shadow-sm", isSelectionMode && "border-t-2 border-t-[#0c5d69]")}>
        <CardHeader className="border-b border-slate-100 md:flex md:flex-row md:items-center md:justify-between px-5 py-4 gap-4 space-y-0">
          <div className="space-y-1">
            <CardTitle className="text-base font-semibold text-[#121c1d] leading-none">
              {isSelectionMode ? 'Select a patient' : 'Patients'}
            </CardTitle>
            <CardDescription className="text-xs text-slate-400 leading-snug">
              {isSelectionMode ? 'Choose a patient to schedule an appointment' : 'Search, view, and manage all registered patients'}
            </CardDescription>
          </div>

          <div className="flex flex-col sm:flex-row gap-2.5 w-full md:w-auto shrink-0">
            {isSelectionMode && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  const params = new URLSearchParams(searchParams.toString());
                  params.delete('mode');
                  router.replace(`${pathname}?${params.toString()}`, { scroll: false });
                }}
                className="h-9 text-xs text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </Button>
            )}
            <div className="relative w-full sm:w-60">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300" />
              <Input
                placeholder="Search patients..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="pl-9 h-9 rounded-lg border-slate-200 bg-white text-sm"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center">
                {(isLoading || isRefetching) && !!urlSearch ? (
                  <Loader2 className="h-3.5 w-3.5 text-slate-300 animate-spin" />
                ) : searchInput ? (
                  <button
                    onClick={() => setSearchInput('')}
                    className="text-slate-300 hover:text-slate-500 text-lg leading-none flex items-center justify-center"
                  >
                    ×
                  </button>
                ) : null}
              </div>
            </div>

            {!isSelectionMode && (
              <Button
                className="h-9 bg-[#0c5d69] hover:bg-[#0a4f59] text-white rounded-lg text-xs font-medium"
                onClick={() => setRegistrationOpen(true)}
              >
                <UserPlus className="h-4 w-4 mr-1.5" />
                Add Patient
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0 min-h-[400px] flex flex-col">
          {isLoading ? (
            <TableSkeleton />
          ) : patients.length === 0 ? (
            <EmptyState hasSearch={!!urlSearch} onClear={() => setSearchInput('')} onRegister={() => setRegistrationOpen(true)} />
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto flex-1">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/50">
                      <th className="px-5 py-3 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider w-[300px]">Patient</th>
                      <th className="px-5 py-3 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider w-[120px]">File No.</th>
                      <th className="px-5 py-3 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider w-[160px]">Phone</th>
                      <th className="px-5 py-3 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider w-[140px] hidden lg:table-cell">Last Visit</th>
                      <th className="px-5 py-3 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider w-[100px] hidden lg:table-cell">Status</th>
                      <th className="px-5 py-3 text-right text-[10px] font-semibold text-slate-400 uppercase tracking-wider w-[80px]"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {patients.map((patient) => {
                      const patientName = `${patient.firstName} ${patient.lastName}`;
                      const isHighlighted = activeHighlight === patient.id;
                      const status = getPatientStatus({
                        lastVisit: patient.lastVisitAt,
                        currentQueueStatus: null,
                        outstandingBalance: 0,
                      });

                      return (
                        <HighlightRow
                          key={patient.id}
                          highlighted={isHighlighted}
                          onClick={isSelectionMode ? () => {
                            openBookingDialog({
                              initialPatientId: patient.id,
                              source: AppointmentSource.FRONTDESK_SCHEDULED,
                              bookingChannel: BookingChannel.PATIENT_LIST,
                            });
                          } : () => router.push(`/frontdesk/patient/${patient.id}`)}
                        >
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-3">
                              <ProfileImage
                                url={patient.profileImage}
                                name={patientName}
                                bgColor={patient.colorCode}
                                className="h-9 w-9"
                                textClassName="text-white text-xs font-semibold"
                              />
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-[#121c1d] truncate max-w-[200px]">
                                  {patientName}
                                </p>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <span className="text-xs text-slate-400 capitalize">{patient.gender?.toLowerCase()}</span>
                                  <span className="text-slate-200">.</span>
                                  <span className="text-xs text-slate-400">
                                    {patient.dateOfBirth ? `${calculateAge(patient.dateOfBirth)} yrs` : 'N/A'}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </td>

                          <td className="px-5 py-3">
                            <span className="inline-flex items-center font-mono text-xs font-medium text-slate-600 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded">
                              {patient.fileNumber || '--'}
                            </span>
                          </td>

                          <td className="px-5 py-3">
                            {patient.phone ? (
                              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                <Phone className="h-3 w-3 text-slate-300 shrink-0" />
                                <span className="truncate max-w-[140px]">{patient.phone}</span>
                              </div>
                            ) : (
                              <span className="text-xs text-slate-300">--</span>
                            )}
                          </td>

                          <td className="px-5 py-3 hidden lg:table-cell">
                            {patient.lastVisitAt ? (
                              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                <Clock className="h-3 w-3 text-slate-300 shrink-0" />
                                {format(new Date(patient.lastVisitAt), 'MMM d, yyyy')}
                              </div>
                            ) : (
                              <span className="text-xs text-slate-300">No visits</span>
                            )}
                          </td>

                          <td className="px-5 py-3 hidden lg:table-cell">
                            <PatientStatusIndicator status={status} className="text-[10px]" />
                          </td>

                          <td className="px-5 py-3 text-right">
                            <div onClick={(e) => e.stopPropagation()}>
                              <PatientTableActions
                                patient={{
                                  id: patient.id,
                                  firstName: patient.firstName,
                                  lastName: patient.lastName,
                                  phone: patient.phone,
                                  email: patient.email,
                                }}
                              />
                            </div>
                          </td>
                        </HighlightRow>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden divide-y divide-slate-100">
                {patients.map((patient) => {
                  const patientName = `${patient.firstName} ${patient.lastName}`;
                  const isHighlighted = activeHighlight === patient.id;

                  return (
                    <Link
                      key={patient.id}
                      href={isSelectionMode ? '#' : `/frontdesk/patient/${patient.id}`}
                      onClick={isSelectionMode ? (e) => {
                        e.preventDefault();
                        openBookingDialog({
                          initialPatientId: patient.id,
                          source: AppointmentSource.FRONTDESK_SCHEDULED,
                          bookingChannel: BookingChannel.PATIENT_LIST,
                        });
                      } : undefined}
                      className="block"
                    >
                      <div className={cn(
                        "p-4 transition-colors",
                        isHighlighted ? 'bg-[#e6f0f1]' : 'hover:bg-slate-50 active:bg-slate-100'
                      )}>
                        <div className="flex items-start gap-3">
                          <ProfileImage
                            url={patient.profileImage}
                            name={patientName}
                            bgColor={patient.colorCode}
                            className="h-10 w-10"
                            textClassName="text-white text-xs font-semibold"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-[#121c1d] truncate">{patientName}</p>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <span className="text-xs text-slate-400 capitalize">{patient.gender?.toLowerCase()}</span>
                                  <span className="text-slate-200">.</span>
                                  <span className="text-xs text-slate-400">
                                    {patient.dateOfBirth ? `${calculateAge(patient.dateOfBirth)} yrs` : 'N/A'}
                                  </span>
                                </div>
                              </div>
                              {patient.fileNumber && (
                                <span className="font-mono text-[10px] font-medium text-slate-500 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded shrink-0">
                                  {patient.fileNumber}
                                </span>
                              )}
                            </div>

                            <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                              {patient.phone && (
                                <div className="flex items-center gap-1 text-xs text-slate-500">
                                  <Phone className="h-3 w-3 text-slate-300" />
                                  <span>{patient.phone}</span>
                                </div>
                              )}
                            </div>

                            <div className="mt-3 flex items-center justify-end" onClick={(e) => e.stopPropagation()}>
                              <PatientTableActions
                                patient={{
                                  id: patient.id,
                                  firstName: patient.firstName,
                                  lastName: patient.lastName,
                                  phone: patient.phone,
                                  email: patient.email,
                                }}
                              />
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

          {/* Pagination */}
          {!!urlSearch && !isLoading && meta.totalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 mt-auto">
              <p className="text-xs text-slate-400">
                Showing <span className="font-medium text-[#121c1d]">{startRecord}</span> – <span className="font-medium text-[#121c1d]">{endRecord}</span> of{' '}
                <span className="font-medium text-[#121c1d]">{meta.totalRecords.toLocaleString()}</span> patients
              </p>

              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 rounded-md border-slate-200"
                  onClick={() => handlePageChange(Math.max(1, page - 1))}
                  disabled={page <= 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>

                {generatePageNumbers(page, meta.totalPages).map((p, idx) =>
                  p === '...' ? (
                    <span key={`dots-${idx}`} className="px-1.5 text-xs text-slate-300">...</span>
                  ) : (
                    <Button
                      key={p}
                      variant={page === p ? 'default' : 'outline'}
                      size="icon"
                      onClick={() => handlePageChange(p as number)}
                      className={cn(
                        'h-8 w-8 rounded-md text-xs font-medium',
                        page !== p && 'border-slate-200 text-slate-500 hover:bg-slate-50'
                      )}
                    >
                      {p}
                    </Button>
                  )
                )}

                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 rounded-md border-slate-200"
                  onClick={() => handlePageChange(Math.min(meta.totalPages, page + 1))}
                  disabled={page >= meta.totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Registration Dialog */}
      <PatientRegistrationDialog
        open={registrationOpen}
        onClose={() => setRegistrationOpen(false)}
        onSuccess={() => {
          setRegistrationOpen(false);
          queryClient.invalidateQueries({ queryKey: ['frontdesk', 'patients'] });
          queryClient.invalidateQueries({ queryKey: ['frontdesk', 'patient-stats'] });
        }}
      />
    </div>
  );
}

/* ═══════════════════ Highlight Row ═══════════════════ */

function HighlightRow({
  children,
  highlighted,
  onClick,
}: {
  children: React.ReactNode;
  highlighted: boolean;
  onClick: () => void;
}) {
  const ref = useRef<HTMLTableRowElement>(null);

  useEffect(() => {
    if (highlighted && ref.current) {
      ref.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [highlighted]);

  return (
    <tr
      ref={ref}
      className={cn(
        'group transition-colors duration-150 cursor-pointer border-b border-slate-100 last:border-0',
        highlighted
          ? 'bg-[#e6f0f1]'
          : 'hover:bg-slate-50'
      )}
      onClick={onClick}
    >
      {children}
    </tr>
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
            <p className="text-xs text-slate-400">Loading patient registry...</p>
          </div>
        </div>
      }
    >
      <FrontdeskPatientsContent />
    </Suspense>
  );
}

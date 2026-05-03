'use client';

/**
 * Theater Hub — unified Operations page for theater technicians.
 *
 * Consolidates three previously separate pages into one tabbed workspace:
 *   Schedule      → /theater-tech/theater-schedule  (read + reschedule/cancel)
 *   Booking Queue → /theater-tech/theater-scheduling (cases ready for booking)
 *   Suites        → /theater-tech/theaters           (manage operating rooms)
 *
 * All functionality is preserved; only the navigation entry-point changed.
 * Old URLs are kept as redirect pages so existing bookmarks still work.
 */

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import {
  AlertCircle, Building2, Calendar, CalendarClock,
  CheckCircle2, ChevronLeft, ChevronRight, Loader2,
  MoreHorizontal, Scissors, Search, XCircle,
} from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { useAuth } from '@/hooks/patient/useAuth';
import { useTheaterSchedule } from '@/hooks/theater-tech/useTheaterSchedule';
import { useTheaterSchedulingQueue } from '@/hooks/theater-tech/useTheaterSchedulingQueue';
import { theaterTechTheaterApi } from '@/lib/api/theater-tech/theaters';
import { formatDoctorName } from '@/lib/formatting/formatDoctorName';
import { cn } from '@/lib/utils';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

import { BookingStatusBadge } from '@/components/theater-tech/schedule/BookingStatusBadge';
import { CancelBookingDialog } from '@/components/theater-tech/schedule/CancelBookingDialog';
import { RescheduleBookingDialog } from '@/components/theater-tech/schedule/RescheduleBookingDialog';
import { TheaterBookingModal } from '@/components/theater-tech/booking/TheaterBookingModal';
import { Theater, TheaterFormData, TheaterType, EMPTY_FORM } from '@/app/admin/theaters/_components/types';
import { TheaterDetailDialog } from '@/app/admin/theaters/_components/TheaterDetailDialog';
import { TheaterFormDialog } from '@/app/admin/theaters/_components/TheaterFormDialog';
import { TheaterDeleteDialog } from '@/app/admin/theaters/_components/TheaterDeleteDialog';

// ─── helpers ──────────────────────────────────────────────────────────────────
function ymd(date: Date) { return format(date, 'yyyy-MM-dd'); }
function addDays(date: Date, days: number) { const d = new Date(date); d.setDate(d.getDate() + days); return d; }
function toTheaterType(v: string): TheaterType { return v === 'MAJOR' || v === 'MINOR' || v === 'PROCEDURE_ROOM' ? v : 'MAJOR'; }
function formatKsh(n: number) { return new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 }).format(Math.round(n || 0)); }

type Tab = 'schedule' | 'queue' | 'suites';
type QueueCase = NonNullable<ReturnType<typeof useTheaterSchedulingQueue>['data']>['cases'][number];

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'schedule', label: 'Schedule',      icon: <CalendarClock className="h-4 w-4" /> },
  { id: 'queue',    label: 'Booking Queue', icon: <Scissors className="h-4 w-4" /> },
  { id: 'suites',   label: 'Suites',        icon: <Building2 className="h-4 w-4" /> },
];

// ─── Schedule tab ─────────────────────────────────────────────────────────────
function ScheduleTab() {
  const { user, isAuthenticated } = useAuth();
  const [date, setDate] = useState(() => ymd(new Date()));
  const { data, isLoading, error } = useTheaterSchedule(date, { enabled: isAuthenticated && !!user });

  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelBookingId, setCancelBookingId] = useState<string | null>(null);
  const [cancelTitle, setCancelTitle] = useState('');
  const [cancelSubtitle, setCancelSubtitle] = useState<string | undefined>(undefined);
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [rescheduleBooking, setRescheduleBooking] = useState<null | { bookingId: string; caseId: string; patientName: string; procedure: string; startTime: string; endTime: string }>(null);

  const theaters = useMemo(() => (data?.theaters ?? []).map(x => ({ ...x, bookings: (x.bookings || []).slice().sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()) })), [data?.theaters]);

  return (
    <div className="space-y-4">
      <Card className="border-slate-200">
        <CardHeader className="border-b border-slate-100 bg-slate-50/70">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-base">{format(new Date(date), 'EEEE, dd MMM yyyy')}</CardTitle>
              <p className="text-xs text-slate-500 mt-0.5">Confirmed bookings and active slot locks</p>
            </div>
            <div className="flex items-center gap-2">
              <Button size="icon" variant="outline" onClick={() => setDate(ymd(addDays(new Date(date), -1)))} aria-label="Previous day"><ChevronLeft className="h-4 w-4" /></Button>
              <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-[160px] bg-white" />
              <Button size="icon" variant="outline" onClick={() => setDate(ymd(addDays(new Date(date), 1)))} aria-label="Next day"><ChevronRight className="h-4 w-4" /></Button>
              <Button variant="outline" onClick={() => setDate(ymd(new Date()))}>Today</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">{[0,1,2].map(i => <Skeleton key={i} className="h-16" />)}</div>
          ) : error ? (
            <div className="p-10 text-center"><p className="font-medium text-slate-900">Failed to load schedule</p><p className="text-sm text-slate-500 mt-1">{error.message}</p></div>
          ) : theaters.length === 0 ? (
            <div className="p-12 text-center"><p className="font-medium text-slate-900">No active theaters</p><p className="text-sm text-slate-500 mt-1">Ask an admin to configure theaters.</p></div>
          ) : (
            <div className="divide-y divide-slate-100">
              {theaters.map(theater => (
                <div key={theater.id} className="p-4 sm:p-5">
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <div><div className="font-semibold text-slate-900">{theater.name}</div><div className="text-xs text-slate-500">{theater.type} · KES {Number(theater.hourlyRate || 0).toLocaleString()}/hr</div></div>
                    <div className="text-xs text-slate-500">{theater.bookings.length} booking{theater.bookings.length === 1 ? '' : 's'}</div>
                  </div>
                  {theater.bookings.length === 0 ? (
                    <div className="text-sm text-slate-500 border border-dashed border-slate-200 rounded-lg p-4">No bookings for this date.</div>
                  ) : (
                    <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[120px]">Time</TableHead>
                            <TableHead>Patient</TableHead>
                            <TableHead className="hidden md:table-cell">Procedure</TableHead>
                            <TableHead className="w-[110px]">Status</TableHead>
                            <TableHead className="w-[200px] text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {theater.bookings.map(b => {
                            const start = new Date(b.startTime);
                            const end = new Date(b.endTime);
                            const canReschedule = (b.status || '').toUpperCase() === 'CONFIRMED';
                            const canCancel = !['CANCELLED','COMPLETED'].includes((b.status || '').toUpperCase());
                            return (
                              <TableRow key={b.id}>
                                <TableCell className="font-mono text-xs text-slate-700">{format(start,'HH:mm')}–{format(end,'HH:mm')}</TableCell>
                                <TableCell><div className="font-medium text-slate-900 truncate">{b.patientName}</div><div className="text-xs text-slate-400 font-mono">{b.caseNumber}</div></TableCell>
                                <TableCell className="hidden md:table-cell text-sm text-slate-700">{b.procedure}</TableCell>
                                <TableCell><BookingStatusBadge status={b.status} /></TableCell>
                                <TableCell className="text-right">
                                  <div className="inline-flex items-center justify-end gap-2">
                                    <Button size="sm" variant="outline" disabled={!canReschedule} onClick={() => { if (!canReschedule) { toast.error('Only confirmed bookings can be rescheduled.'); return; } setRescheduleBooking({ bookingId: b.id, caseId: b.caseId, patientName: b.patientName, procedure: b.procedure, startTime: b.startTime, endTime: b.endTime }); setRescheduleOpen(true); }}>Reschedule</Button>
                                    <Button size="sm" variant="outline" disabled={!canCancel} onClick={() => { if (!canCancel) return; setCancelBookingId(b.id); setCancelTitle(`${b.patientName} — ${b.procedure}`); setCancelSubtitle(`${theater.name} · ${format(start,'MMM d, yyyy HH:mm')}–${format(end,'HH:mm')}`); setCancelOpen(true); }}><XCircle className="h-4 w-4 mr-1" />Cancel</Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      <CancelBookingDialog open={cancelOpen} onOpenChange={setCancelOpen} bookingId={cancelBookingId} title={cancelTitle} subtitle={cancelSubtitle} />
      <RescheduleBookingDialog open={rescheduleOpen} onOpenChange={open => { setRescheduleOpen(open); if (!open) setRescheduleBooking(null); }} booking={rescheduleBooking} />
    </div>
  );
}

// ─── Booking Queue tab ────────────────────────────────────────────────────────
function BookingQueueTab() {
  const { user, isAuthenticated } = useAuth();
  const { data, isLoading, error } = useTheaterSchedulingQueue({ enabled: isAuthenticated && !!user });
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCase, setSelectedCase] = useState<QueueCase | null>(null);
  const [isBookingOpen, setIsBookingOpen] = useState(false);

  const filtered = useMemo(() => {
    const cases = data?.cases ?? [];
    if (!searchQuery.trim()) return cases;
    const q = searchQuery.trim().toLowerCase();
    return cases.filter(c => [c.patient?.name, c.patient?.fileNumber, c.procedure, c.surgeon?.name].some(v => v?.toLowerCase().includes(q)));
  }, [data?.cases, searchQuery]);

  return (
    <div className="space-y-4">
      <Card className="border-slate-200">
        <CardHeader className="border-b border-slate-100 bg-slate-50/70">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div><CardTitle className="text-base">Ready for Booking</CardTitle><p className="text-xs text-slate-500 mt-0.5">Cases that cleared ward prep and are ready for a theater slot</p></div>
            <div className="relative w-full sm:w-[300px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input placeholder="Patient, file no, procedure, surgeon…" className="pl-9 bg-white" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (<div className="p-6 space-y-3">{[0,1,2].map(i=><Skeleton key={i} className="h-16"/>)}</div>)
          : error ? (<div className="p-10 text-center"><AlertCircle className="h-10 w-10 text-rose-500 mx-auto mb-3"/><p className="font-medium">{error.message}</p></div>)
          : filtered.length === 0 ? (<div className="p-12 text-center"><CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto mb-3"/><p className="font-medium text-slate-900">No cases ready for booking</p><p className="text-sm text-slate-500 mt-1">When ward prep is finalised, cases appear here automatically.</p></div>)
          : (
            <div className="divide-y divide-slate-100">
              {filtered.map(c => (
                <div key={c.id} className="p-4 sm:p-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-slate-900 truncate">{c.patient?.name ?? 'Unknown patient'}</p>
                      {c.patient?.fileNumber && <span className="text-xs text-slate-400 font-mono">{c.patient.fileNumber}</span>}
                      <Badge variant="outline" className="text-[11px]">{c.urgency}</Badge>
                      {c.preOpChecklistFinalized && <Badge className="text-[11px] bg-emerald-50 text-emerald-700 border border-emerald-200">Ward Prep Complete</Badge>}
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-sm text-slate-600 flex-wrap">
                      <Scissors className="h-4 w-4 text-slate-400" />
                      <span className="truncate">{c.procedure}</span>
                      {c.surgeon?.name && <><span className="text-slate-400">·</span><span className="truncate">{formatDoctorName(c.surgeon.name)}</span></>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 sm:shrink-0">
                    <Button size="sm" onClick={() => { setSelectedCase(c); setIsBookingOpen(true); }}>Book Theater</Button>
                    <Button size="sm" variant="outline" asChild><Link href={`/theater-tech/surgical-cases/${c.id}`}>Open Case</Link></Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      {selectedCase && (<TheaterBookingModal isOpen={isBookingOpen} onClose={() => setIsBookingOpen(false)} caseId={selectedCase.id} caseDurationMinutes={60} patientName={selectedCase.patient?.name ?? 'Patient'} procedureName={selectedCase.procedure} onBookingConfirmed={() => setIsBookingOpen(false)} />)}
    </div>
  );
}

// ─── Suites tab ───────────────────────────────────────────────────────────────
function SuitesTab() {
  const queryClient = useQueryClient();
  const [selectedTheater, setSelectedTheater] = useState<Theater | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [formData, setFormData] = useState<TheaterFormData>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const { data, isLoading, error } = useQuery({ queryKey: ['theater-tech', 'theaters'], queryFn: async () => { const res = await theaterTechTheaterApi.getAll(); if (!res.success) throw new Error(res.error || 'Failed to load theaters'); return res.data ?? []; } });
  const theaters = useMemo(() => (Array.isArray(data) ? data : []) as Theater[], [data]);
  const filtered = useMemo(() => { const q = searchQuery.trim().toLowerCase(); return q ? theaters.filter(t => t.name?.toLowerCase().includes(q) || t.type?.toLowerCase().includes(q)) : theaters; }, [theaters, searchQuery]);

  const createMutation = useMutation({ mutationFn: (p: TheaterFormData) => theaterTechTheaterApi.create(p), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['theater-tech','theaters'] }); toast.success('Theater commissioned'); setIsFormOpen(false); }, onError: () => toast.error('Failed to commission theater') });
  const updateMutation = useMutation({ mutationFn: ({ id, payload }: { id: string; payload: TheaterFormData | Partial<Theater> }) => theaterTechTheaterApi.update(id, payload), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['theater-tech','theaters'] }); toast.success('Theater updated'); setIsFormOpen(false); }, onError: () => toast.error('Failed to update theater') });
  const deleteMutation = useMutation({ mutationFn: (id: string) => theaterTechTheaterApi.delete(id), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['theater-tech','theaters'] }); toast.success('Theater decommissioned'); setIsDeleteOpen(false); }, onError: (err: any) => toast.error(err?.response?.data?.error || 'Failed to decommission theater') });
  const toggleMutation = useMutation({ mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) => theaterTechTheaterApi.update(id, { is_active }), onSuccess: () => queryClient.invalidateQueries({ queryKey: ['theater-tech','theaters'] }) });

  const handleAdd = () => { setEditingId(null); setFormData(EMPTY_FORM); setIsFormOpen(true); };
  const handleEdit = (t: Theater) => { setEditingId(t.id); setFormData({ name: t.name, type: toTheaterType(t.type), color_code: t.color_code || '', notes: t.notes || '', operational_hours: t.operational_hours || '', capabilities: t.capabilities || '', rate_per_minute: Math.round((t.hourly_rate || 0) / 60) }); setIsFormOpen(true); };
  const handleSave = () => { if (!formData.name) return void toast.error('Name is required'); editingId ? updateMutation.mutate({ id: editingId, payload: formData }) : createMutation.mutate(formData); };

  if (isLoading) return <div className="h-48 flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-slate-400" /></div>;
  if (error) return <div className="h-48 flex flex-col items-center justify-center gap-3"><AlertCircle className="h-8 w-8 text-rose-500" /><p className="text-sm font-medium text-slate-700">Failed to load theaters</p><Button variant="outline" size="sm" onClick={() => queryClient.invalidateQueries({ queryKey: ['theater-tech','theaters'] })}>Retry</Button></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="relative w-full sm:w-[280px]"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" /><Input placeholder="Search by name or type…" className="pl-9 bg-white" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} /></div>
        <Button onClick={handleAdd} className="shrink-0">Add Theater</Button>
      </div>
      <Card className="border-slate-200">
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="p-10 text-center"><p className="font-medium text-slate-900">No theaters found</p><Button onClick={handleAdd} className="mt-4">Add Theater</Button></div>
          ) : (
            <Table>
              <TableHeader className="bg-white">
                <TableRow>
                  <TableHead>Theater</TableHead>
                  <TableHead className="hidden md:table-cell">Rate</TableHead>
                  <TableHead className="hidden lg:table-cell">Today</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(t => {
                  const perMin = Math.round((t.hourly_rate || 0) / 60);
                  const isActive = !!t.is_active;
                  return (
                    <TableRow key={t.id} className="hover:bg-slate-50/50">
                      <TableCell className="py-3"><button type="button" className="text-left" onClick={() => { setSelectedTheater(t); setIsDetailOpen(true); }}><div className="font-medium text-slate-900">{t.name}</div><div className="text-xs text-muted-foreground mt-0.5"><Badge variant="outline" className="text-[10px]">{t.type}</Badge></div></button></TableCell>
                      <TableCell className="hidden md:table-cell py-3 text-sm font-mono">{formatKsh(perMin)}/min</TableCell>
                      <TableCell className="hidden lg:table-cell py-3 text-sm">{t.bookings?.length ?? 0} today</TableCell>
                      <TableCell className="py-3"><div className="flex items-center gap-2"><Switch checked={isActive} onCheckedChange={() => toggleMutation.mutate({ id: t.id, is_active: !isActive })} className="data-[state=checked]:bg-emerald-600" /><span className="text-xs">{isActive ? 'Active' : 'Inactive'}</span></div></TableCell>
                      <TableCell className="py-3 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => { setSelectedTheater(t); setIsDetailOpen(true); }}>View</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEdit(t)}>Edit</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-red-600" onClick={() => { setSelectedTheater(t); setIsDeleteOpen(true); }}>Delete</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      <TheaterDetailDialog open={isDetailOpen} onOpenChange={setIsDetailOpen} theater={selectedTheater} />
      <TheaterFormDialog open={isFormOpen} onOpenChange={setIsFormOpen} formData={formData} setFormData={setFormData} isEditing={!!editingId} saving={createMutation.isPending || updateMutation.isPending} onSave={handleSave} />
      <TheaterDeleteDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen} theater={selectedTheater} saving={deleteMutation.isPending} onDelete={() => selectedTheater && deleteMutation.mutate(selectedTheater.id)} />
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function TheaterHubPage() {
  const [tab, setTab] = useState<Tab>('schedule');

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Theater</h1>
        <p className="text-sm text-slate-500 mt-1">Schedule, booking queue, and suite management in one place</p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 border-b border-slate-200">
        {TABS.map(t => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              'flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-1',
              '-mb-px border-b-2',
              tab === t.id
                ? 'border-brand-primary text-brand-primary'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300',
            )}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab panels */}
      {tab === 'schedule' && <ScheduleTab />}
      {tab === 'queue'    && <BookingQueueTab />}
      {tab === 'suites'   && <SuitesTab />}
    </div>
  );
}

'use client';

/**
 * Patients Hub — unified patient-centric page for theater technicians.
 *
 * Consolidates three previously separate pages into one tabbed workspace:
 *   Search               → /theater-tech/patients            (search + plan surgery)
 *   Upcoming Procedures  → /theater-tech/upcoming-procedures (date-ranged procedure list)
 *   Recent Consultations → /theater-tech/recent-consultations (completed consultations)
 *
 * All functionality preserved. Old URLs redirect here so no links break.
 */

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import type { DateRange } from 'react-day-picker';
import {
  Calendar, ChevronLeft, ChevronRight,
  FileText, Loader2, Scissors, Search, Stethoscope, User,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar as RangeCalendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Patient { id: string; first_name: string; last_name: string; file_number: string | null; date_of_birth: string | null; gender: string | null; }
type UpcomingProcedure = { appointmentId: number; appointmentDate: string; time: string; status: string; surgicalCaseId: string | null; patient: { id: string; first_name: string; last_name: string; file_number: string | null; date_of_birth: string | null; gender: 'MALE' | 'FEMALE' | 'OTHER' | null }; surgeon: { id: string; name: string }; };
type RecentConsultation = { consultationId: number; appointmentId: number; completedAt: string | null; updatedAt: string; patient: { id: string; first_name: string; last_name: string; file_number: string | null }; doctor: { id: string; name: string }; casePlan: { id: number; readinessStatus: string; readyForSurgery: boolean; updatedAt: string } | null; };

// ─── Helpers ──────────────────────────────────────────────────────────────────
function toYmd(d: Date) { return d.toISOString().slice(0, 10); }
function addDays(d: Date, n: number) { const r = new Date(d); r.setDate(r.getDate() + n); return r; }
function parseYmd(v: string): Date | null { if (!/^\d{4}-\d{2}-\d{2}$/.test(v.trim())) return null; const d = new Date(`${v.trim()}T00:00:00.000Z`); return Number.isFinite(d.getTime()) ? d : null; }
function ageAt(dobIso: string | null, atIso: string): string { if (!dobIso) return '—'; const dob = new Date(dobIso); const at = new Date(atIso); let y = at.getFullYear() - dob.getFullYear(); const m = at.getMonth() - dob.getMonth(); if (m < 0 || (m === 0 && at.getDate() < dob.getDate())) y--; return y >= 0 ? String(y) : '—'; }
function calcAge(dob: string | null) { if (!dob) return null; return Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 86400000)); }

type Tab = 'search' | 'upcoming' | 'consultations';
const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'search',        label: 'Search',               icon: <User className="h-4 w-4" /> },
  { id: 'upcoming',      label: 'Upcoming Procedures',  icon: <Scissors className="h-4 w-4" /> },
  { id: 'consultations', label: 'Recent Consultations', icon: <Stethoscope className="h-4 w-4" /> },
];

// ─── Search tab ───────────────────────────────────────────────────────────────
function SearchTab() {
  const router = useRouter();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [creatingCase, setCreatingCase] = useState<string | null>(null);

  useEffect(() => {
    const q = searchQuery.trim();
    if (q.length < 2) { setPatients([]); setTotalPages(1); setPage(1); return; }
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/theater-tech/patients?page=${page}&search=${encodeURIComponent(q)}`);
        const data = await res.json();
        if (data.success) { setPatients(data.data || []); setTotalPages(data.totalPages || 1); }
        else throw new Error(data.error || 'Failed to fetch patients');
      } catch (e) { toast.error(e instanceof Error ? e.message : 'Failed to fetch patients'); }
      finally { setLoading(false); }
    }, 300);
    return () => clearTimeout(timer);
  }, [page, searchQuery]);

  const handleCreateCase = async (patientId: string) => {
    setCreatingCase(patientId);
    try {
      const res = await fetch('/api/theater-tech/surgical-cases', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ patientId }) });
      const data = await res.json();
      if (data.success && data.surgicalCaseId) router.push(`/theater-tech/surgical-cases/${data.surgicalCaseId}/edit`);
      else toast.error(data.error || 'Failed to create case');
    } catch { toast.error('Failed to create case'); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">Search for a patient to start surgical planning</p>
        <Badge variant="outline" className="text-xs">{searchQuery.trim().length < 2 ? 'Search required' : `${patients.length} results`}</Badge>
      </div>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input placeholder="Search by name or file number…" className="pl-9 bg-white" value={searchQuery} onChange={e => { setSearchQuery(e.target.value); setPage(1); }} />
      </div>
      <Card className="border-slate-200 shadow-sm">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-4 space-y-2">{[1,2,3,4,5].map(i => <Skeleton key={i} className="h-12" />)}</div>
          ) : patients.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-sm">{searchQuery.trim().length < 2 ? 'Type at least 2 characters to search patients.' : 'No patients match your search.'}</div>
          ) : (
            <>
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      {['Patient','File #','Age / Sex','Action'].map(h => <th key={h} className={cn('text-left text-xs font-medium text-slate-500 px-4 py-2.5', h === 'Action' && 'text-right')}>{h}</th>)}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {patients.map(p => { const age = calcAge(p.date_of_birth); const sex = p.gender?.toUpperCase() ?? '—'; return (
                      <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 py-2.5"><div className="flex items-center gap-2.5"><div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center"><User className="h-4 w-4 text-slate-500" /></div><p className="text-sm font-medium text-slate-900">{p.first_name} {p.last_name}</p></div></td>
                        <td className="px-4 py-2.5"><div className="flex items-center gap-1.5 text-slate-500"><FileText className="h-3.5 w-3.5" /><span className="text-sm">{p.file_number || '—'}</span></div></td>
                        <td className="px-4 py-2.5 text-sm text-slate-700">{age !== null ? `${age}y` : '—'} / {sex}</td>
                        <td className="px-4 py-2.5 text-right"><Button size="sm" variant="outline" className="h-8 text-xs gap-1.5" onClick={() => handleCreateCase(p.id)} disabled={creatingCase === p.id}>{creatingCase === p.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Scissors className="h-3 w-3" />}Plan Surgery</Button></td>
                      </tr>
                    ); })}
                  </tbody>
                </table>
              </div>
              <div className="md:hidden flex flex-col divide-y divide-slate-100">
                {patients.map(p => { const age = calcAge(p.date_of_birth); const sex = p.gender?.toUpperCase() ?? '—'; return (
                  <div key={p.id} className="p-4 flex flex-col gap-3">
                    <div className="flex items-center gap-3"><div className="h-10 w-10 shrink-0 rounded-full bg-slate-100 flex items-center justify-center"><User className="h-5 w-5 text-slate-500" /></div><div className="flex-1 min-w-0"><p className="text-sm font-semibold text-slate-900 truncate">{p.first_name} {p.last_name}</p><div className="flex flex-wrap gap-x-3 gap-y-1 mt-0.5 text-xs text-slate-500"><div className="flex items-center gap-1"><FileText className="h-3 w-3" /><span>{p.file_number || '—'}</span></div><span>{age !== null ? `${age}y` : '—'} / {sex}</span></div></div></div>
                    <Button size="sm" variant="outline" className="w-full h-10" onClick={() => handleCreateCase(p.id)} disabled={creatingCase === p.id}>{creatingCase === p.id ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Scissors className="h-4 w-4 mr-2" />}Plan Surgery</Button>
                  </div>
                ); })}
              </div>
            </>
          )}
        </CardContent>
      </Card>
      {searchQuery.trim().length >= 2 && totalPages > 1 && (
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}><ChevronLeft className="h-4 w-4" /></Button>
          <span className="text-xs text-slate-500">Page {page} of {totalPages}</span>
          <Button variant="ghost" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}><ChevronRight className="h-4 w-4" /></Button>
        </div>
      )}
    </div>
  );
}

// ─── Upcoming Procedures tab ──────────────────────────────────────────────────
function UpcomingTab() {
  const router = useRouter();
  const today = useMemo(() => new Date(), []);
  const [from, setFrom] = useState(() => toYmd(today));
  const [to, setTo] = useState(() => toYmd(addDays(today, 14)));
  const [q, setQ] = useState('');
  const [rangeOpen, setRangeOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState<number | null>(null);
  const [items, setItems] = useState<UpcomingProcedure[]>([]);
  const debounced = useMemo(() => q.trim(), [q]);
  const selectedRange: DateRange | undefined = useMemo(() => { const f = parseYmd(from); const t = parseYmd(to); return f && t ? { from: f, to: t } : undefined; }, [from, to]);

  useEffect(() => {
    const tid = setTimeout(async () => {
      setLoading(true);
      try {
        const sp = new URLSearchParams({ from, to });
        if (debounced.length >= 2) sp.set('q', debounced);
        const res = await fetch(`/api/theater-tech/upcoming-procedures?${sp}`);
        const json = await res.json() as { success: boolean; data?: UpcomingProcedure[]; error?: string };
        if (!json.success) throw new Error(json.error || 'Failed to load');
        setItems(json.data || []);
      } catch (e) { toast.error(e instanceof Error ? e.message : 'Failed to load upcoming procedures'); }
      finally { setLoading(false); }
    }, 250);
    return () => clearTimeout(tid);
  }, [from, to, debounced]);

  const openOrCreateCase = async (appointment: UpcomingProcedure) => {
    const appointmentId = appointment.appointmentId;
    if (appointment.surgicalCaseId) {
      // Open the case detail view (booking + summary). Editing/planning remains available from there.
      router.push(`/theater-tech/surgical-cases/${appointment.surgicalCaseId}`);
      return;
    }

    setCreating(appointmentId);
    try {
      const res = await fetch(`/api/theater-tech/upcoming-procedures/${appointmentId}/create-surgical-case`, { method: 'POST' });
      const json = await res.json() as { success?: boolean; surgicalCaseId?: string; error?: string };
      if (!json.success || !json.surgicalCaseId) throw new Error(json.error || 'Failed');
      router.push(`/theater-tech/surgical-cases/${json.surgicalCaseId}/edit`);
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Failed'); setCreating(null); }
  };

  const applyPreset = (days: number) => { setFrom(toYmd(new Date())); setTo(toYmd(addDays(new Date(), days))); };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative max-w-md flex-1 min-w-[220px]"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" /><Input value={q} onChange={e => setQ(e.target.value)} placeholder="Search patient name or file number…" className="pl-9 bg-white" /></div>
        <Popover open={rangeOpen} onOpenChange={setRangeOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-9 bg-white text-xs gap-1"><Calendar className="h-3.5 w-3.5" />{selectedRange?.from ? format(selectedRange.from,'MMM d') : 'Start'}<span className="text-slate-400 mx-0.5">→</span>{selectedRange?.to ? format(selectedRange.to,'MMM d, yyyy') : 'End'}</Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-auto p-3">
            <div className="flex items-center gap-2 pb-3">
              {[7,14,30].map(d => <Button key={d} type="button" variant="outline" size="sm" className="h-8 text-xs" onClick={() => applyPreset(d)}>Next {d}d</Button>)}
              <Button type="button" variant="ghost" size="sm" className="h-8 text-xs ml-auto" onClick={() => { setFrom(toYmd(new Date())); setTo(toYmd(addDays(new Date(), 14))); }}>Reset</Button>
            </div>
            <RangeCalendar mode="range" selected={selectedRange} onSelect={range => { if (!range?.from) return; setFrom(toYmd(range.from)); setTo(toYmd(range.to ?? range.from)); }} numberOfMonths={2} />
            <div className="pt-3 flex justify-end"><Button type="button" variant="outline" size="sm" className="h-8 text-xs" onClick={() => setRangeOpen(false)}>Close</Button></div>
          </PopoverContent>
        </Popover>
      </div>
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="pb-3 border-b bg-slate-50/50"><CardTitle className="text-base flex items-center gap-2"><Scissors className="h-4 w-4 text-slate-500" />Procedure appointments</CardTitle></CardHeader>
        <CardContent className="p-0">
          {loading ? <div className="p-4 space-y-2">{[1,2,3,4,5].map(i=><Skeleton key={i} className="h-10"/>)}</div>
          : items.length === 0 ? <div className="p-10 text-center text-sm text-slate-500">{debounced.length >= 2 ? 'No procedures match your search.' : 'No upcoming procedures in this date range.'}</div>
          : <div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Patient</TableHead><TableHead className="hidden sm:table-cell">File No.</TableHead><TableHead>Date / Time</TableHead><TableHead className="hidden md:table-cell">Surgeon</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Action</TableHead></TableRow></TableHeader><TableBody>
            {items.map(a => { const name = `${a.patient.first_name} ${a.patient.last_name}`.trim(); const age = ageAt(a.patient.date_of_birth, a.appointmentDate); const hasCase = !!a.surgicalCaseId; return (
              <TableRow key={a.appointmentId}>
                <TableCell className="py-3"><div className="font-medium text-slate-900">{name}</div><div className="text-xs text-slate-500">Age {age} · {a.patient.gender ?? '—'}</div></TableCell>
                <TableCell className="hidden sm:table-cell py-3 text-xs font-mono text-slate-600">{a.patient.file_number || '—'}</TableCell>
                <TableCell className="py-3 text-sm text-slate-700">{format(new Date(a.appointmentDate),'MMM d, yyyy')}<div className="text-xs text-slate-400">{a.time}</div></TableCell>
                <TableCell className="hidden md:table-cell py-3 text-sm text-slate-800">{a.surgeon.name}</TableCell>
                <TableCell className="py-3"><Badge variant="outline" className="text-[10px]">{a.status}</Badge></TableCell>
                <TableCell className="py-3 text-right">
                  <Button
                    size="sm"
                    variant={hasCase ? "default" : "outline"}
                    className={cn("h-8", hasCase && "bg-slate-900 hover:bg-slate-800")}
                    onClick={() => openOrCreateCase(a)}
                    disabled={creating === a.appointmentId}
                  >
                    {creating === a.appointmentId ? <Loader2 className="h-4 w-4 animate-spin"/> : hasCase ? 'Open case' : 'Create case'}
                  </Button>
                </TableCell>
              </TableRow>
            ); })}
          </TableBody></Table></div>}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Recent Consultations tab ─────────────────────────────────────────────────
function ConsultationsTab() {
  const router = useRouter();
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState<number | null>(null);
  const [items, setItems] = useState<RecentConsultation[]>([]);
  const debounced = useMemo(() => q.trim(), [q]);

  useEffect(() => {
    const query = debounced.trim();
    if (query.length < 2) { setItems([]); return; }
    setLoading(true);
    const tid = setTimeout(async () => {
      try {
        const res = await fetch(`/api/theater-tech/recent-consultations?q=${encodeURIComponent(query)}`);
        const json = await res.json();
        if (!res.ok || !json.success) throw new Error(json.error || 'Failed');
        setItems(json.data || []);
      } catch (e) { toast.error(e instanceof Error ? e.message : 'Failed to load consultations'); }
      finally { setLoading(false); }
    }, 250);
    return () => clearTimeout(tid);
  }, [debounced]);

  const createCase = async (consultationId: number) => {
    setCreating(consultationId);
    try {
      const res = await fetch(`/api/theater-tech/recent-consultations/${consultationId}/create-surgical-case`, { method: 'POST' });
      const json = await res.json();
      if (!res.ok || !json.success || !json.surgicalCaseId) throw new Error(json.error || 'Failed');
      router.push(`/theater-tech/surgical-cases/${json.surgicalCaseId}/edit`);
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Failed'); setCreating(null); }
  };

  return (
    <div className="space-y-4">
      <div className="relative max-w-md"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" /><Input value={q} onChange={e => setQ(e.target.value)} placeholder="Search patient name or file number…" className="pl-9 bg-white" /></div>
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="pb-3 border-b bg-slate-50/50"><CardTitle className="text-base flex items-center gap-2"><Stethoscope className="h-4 w-4 text-slate-500" />Completed consultations</CardTitle></CardHeader>
        <CardContent className="p-0">
          {loading ? <div className="p-4 space-y-2">{[1,2,3,4,5].map(i=><Skeleton key={i} className="h-10"/>)}</div>
          : items.length === 0 ? <div className="p-10 text-center text-sm text-slate-500">{q.trim().length < 2 ? 'Type at least 2 characters to search consultations.' : 'No consultations match your search.'}</div>
          : <div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Patient</TableHead><TableHead className="hidden sm:table-cell">File No.</TableHead><TableHead className="hidden md:table-cell">Surgeon</TableHead><TableHead>Date</TableHead><TableHead>Plan</TableHead><TableHead className="text-right">Action</TableHead></TableRow></TableHeader><TableBody>
            {items.map(c => { const name = `${c.patient.first_name} ${c.patient.last_name}`.trim(); const ready = c.casePlan?.readyForSurgery ?? false; return (
              <TableRow key={c.consultationId}>
                <TableCell className="py-3 font-medium text-slate-900">{name}</TableCell>
                <TableCell className="hidden sm:table-cell py-3 text-xs font-mono text-slate-600">{c.patient.file_number || '—'}</TableCell>
                <TableCell className="hidden md:table-cell py-3 text-sm text-slate-800">{c.doctor.name}</TableCell>
                <TableCell className="py-3 text-sm text-slate-700">{c.completedAt ? format(new Date(c.completedAt),'MMM d, yyyy') : '—'}</TableCell>
                <TableCell className="py-3"><Badge variant="outline" className={cn('text-[10px]', ready && 'border-emerald-200 bg-emerald-50 text-emerald-700')}>{ready ? 'Ready' : c.casePlan?.readinessStatus || 'None'}</Badge></TableCell>
                <TableCell className="py-3 text-right"><Button size="sm" variant="outline" className="h-8" onClick={() => createCase(c.consultationId)} disabled={creating === c.consultationId}>{creating === c.consultationId ? <Loader2 className="h-4 w-4 animate-spin"/> : 'Create case'}</Button></TableCell>
              </TableRow>
            ); })}
          </TableBody></Table></div>}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function PatientsHubPage() {
  const [tab, setTab] = useState<Tab>('search');

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Patients</h1>
        <p className="text-sm text-slate-500 mt-1">Search patients, view upcoming procedures, and review recent consultations</p>
      </div>

      <div className="flex gap-1 border-b border-slate-200">
        {TABS.map(t => (
          <button key={t.id} type="button" onClick={() => setTab(t.id)}
            className={cn('flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors -mb-px border-b-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-1',
              tab === t.id ? 'border-brand-primary text-brand-primary' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300')}>
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {tab === 'search'        && <SearchTab />}
      {tab === 'upcoming'      && <UpcomingTab />}
      {tab === 'consultations' && <ConsultationsTab />}
    </div>
  );
}

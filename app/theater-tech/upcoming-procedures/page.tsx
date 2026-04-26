'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { Calendar, Loader2, Search, Scissors } from 'lucide-react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

type UpcomingProcedure = {
  appointmentId: number;
  appointmentDate: string;
  time: string;
  status: string;
  patient: {
    id: string;
    first_name: string;
    last_name: string;
    file_number: string | null;
    date_of_birth: string | null;
    gender: 'MALE' | 'FEMALE' | 'OTHER' | null;
  };
  surgeon: { id: string; name: string };
};

function toDateOnlyInputValue(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date.getTime());
  d.setDate(d.getDate() + days);
  return d;
}

function computeAgeAt(dobIso: string | null, atIso: string): string {
  if (!dobIso) return '—';
  const dob = new Date(dobIso);
  const at = new Date(atIso);
  if (!Number.isFinite(dob.getTime()) || !Number.isFinite(at.getTime())) return '—';
  let years = at.getFullYear() - dob.getFullYear();
  const m = at.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && at.getDate() < dob.getDate())) years -= 1;
  return years >= 0 ? String(years) : '—';
}

export default function TheaterTechUpcomingProceduresPage() {
  const router = useRouter();

  const today = useMemo(() => new Date(), []);
  const [from, setFrom] = useState<string>(toDateOnlyInputValue(today));
  const [to, setTo] = useState<string>(toDateOnlyInputValue(addDays(today, 14)));
  const [q, setQ] = useState<string>('');

  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState<number | null>(null);
  const [items, setItems] = useState<UpcomingProcedure[]>([]);

  const debounced = useMemo(() => q.trim(), [q]);

  useEffect(() => {
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const sp = new URLSearchParams();
        sp.set('from', from);
        sp.set('to', to);
        if (debounced.length >= 2) sp.set('q', debounced);
        const res = await fetch(`/api/theater-tech/upcoming-procedures?${sp.toString()}`);
        const json: unknown = await res.json();
        if (!res.ok || !json || typeof json !== 'object' || !('success' in json)) {
          throw new Error('Failed to load upcoming procedures');
        }
        const payload = json as { success: boolean; data?: UpcomingProcedure[]; error?: string };
        if (!payload.success) {
          throw new Error(payload.error || 'Failed to load upcoming procedures');
        }
        setItems(payload.data || []);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Failed to load upcoming procedures');
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(t);
  }, [from, to, debounced]);

  const createCase = async (appointmentId: number) => {
    setCreating(appointmentId);
    try {
      const res = await fetch(
        `/api/theater-tech/upcoming-procedures/${appointmentId}/create-surgical-case`,
        { method: 'POST' },
      );
      const json: unknown = await res.json();
      const payload = json as { success?: boolean; surgicalCaseId?: string; error?: string };
      if (!res.ok || !payload?.success || !payload.surgicalCaseId) {
        throw new Error(payload?.error || 'Failed to create surgical case');
      }
      router.push(`/theater-tech/surgical-cases/${payload.surgicalCaseId}/edit`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to create surgical case');
    } finally {
      setCreating(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">Upcoming Procedures</h1>
          <p className="text-sm text-slate-500">
            Doctor-confirmed procedure bookings. Create a surgical case to start theater planning.
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={() => router.push('/theater-tech/patients')} className="gap-2">
          <Scissors className="h-4 w-4" />
          Plan surgery
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative max-w-md flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search patient name or file number..."
            className="pl-9 h-9 bg-white"
          />
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Calendar className="h-4 w-4" />
            <span className="text-xs text-slate-500">Date range</span>
          </div>
          <Input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="h-9 w-[150px] bg-white"
          />
          <Input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="h-9 w-[150px] bg-white"
          />
        </div>
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="pb-3 border-b bg-slate-50/50">
          <CardTitle className="text-base flex items-center gap-2">
            <Scissors className="h-4 w-4 text-slate-500" />
            Procedure appointments
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-4 space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-10" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="p-10 text-center text-sm text-slate-500">
              {debounced.length >= 2 ? 'No procedures match your search.' : 'No upcoming procedures in this date range.'}
            </div>
          ) : (
            <div className="w-full overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[280px]">Patient</TableHead>
                    <TableHead className="w-[140px]">File No.</TableHead>
                    <TableHead className="w-[170px]">Date</TableHead>
                    <TableHead className="w-[110px]">Time</TableHead>
                    <TableHead>Surgeon</TableHead>
                    <TableHead className="w-[140px]">Status</TableHead>
                    <TableHead className="w-[170px] text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((a) => {
                    const patientName = `${a.patient.first_name} ${a.patient.last_name}`.trim();
                    const age = computeAgeAt(a.patient.date_of_birth, a.appointmentDate);
                    const sex = a.patient.gender ? a.patient.gender : '—';
                    return (
                      <TableRow key={a.appointmentId}>
                        <TableCell className="py-3">
                          <div className="font-medium text-slate-900">{patientName}</div>
                          <div className="text-xs text-slate-500">
                            Age {age} • Sex {sex}
                          </div>
                        </TableCell>
                        <TableCell className="py-3">
                          <span className="text-xs font-mono text-slate-600">{a.patient.file_number || '—'}</span>
                        </TableCell>
                        <TableCell className="py-3 text-sm text-slate-700">
                          {format(new Date(a.appointmentDate), 'MMM d, yyyy')}
                        </TableCell>
                        <TableCell className="py-3 text-sm text-slate-700">{a.time}</TableCell>
                        <TableCell className="py-3 text-sm text-slate-800">{a.surgeon.name}</TableCell>
                        <TableCell className="py-3">
                          <Badge variant="outline" className="text-[10px]">
                            {a.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-3 text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8"
                            onClick={() => createCase(a.appointmentId)}
                            disabled={creating === a.appointmentId}
                          >
                            {creating === a.appointmentId ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create case'}
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}


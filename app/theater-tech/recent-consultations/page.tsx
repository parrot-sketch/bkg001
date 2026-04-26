'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { Loader2, Search, Scissors, Stethoscope } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';

type RecentConsultation = {
  consultationId: number;
  appointmentId: number;
  completedAt: string | null;
  updatedAt: string;
  patient: { id: string; first_name: string; last_name: string; file_number: string | null };
  doctor: { id: string; name: string };
  casePlan: { id: number; readinessStatus: string; readyForSurgery: boolean; updatedAt: string } | null;
};

export default function TheaterTechRecentConsultationsPage() {
  const router = useRouter();
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState<number | null>(null);
  const [items, setItems] = useState<RecentConsultation[]>([]);

  const debounced = useMemo(() => q.trim(), [q]);

  useEffect(() => {
    const t = setTimeout(async () => {
      const query = debounced.trim();
      if (query.length < 2) {
        setItems([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const res = await fetch(`/api/theater-tech/recent-consultations?q=${encodeURIComponent(query)}`);
        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json.error || 'Failed to load consultations');
        }
        setItems(json.data || []);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Failed to load consultations');
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [debounced]);

  const createCase = async (consultationId: number) => {
    setCreating(consultationId);
    try {
      const res = await fetch(
        `/api/theater-tech/recent-consultations/${consultationId}/create-surgical-case`,
        { method: 'POST' },
      );
      const json = await res.json();
      if (!res.ok || !json.success || !json.surgicalCaseId) {
        throw new Error(json.error || 'Failed to create surgical case');
      }
      router.push(`/theater-tech/surgical-cases/${json.surgicalCaseId}/edit`);
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
          <h1 className="text-lg font-semibold text-slate-900">Recent Consultations</h1>
          <p className="text-sm text-slate-500">
            Search completed consultations across the system. Create a surgical case to start theater planning.
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={() => router.push('/theater-tech/patients')} className="gap-2">
          <Scissors className="h-4 w-4" />
          Plan surgery
        </Button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search patient name or file number..."
          className="pl-9 h-9 bg-white"
        />
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="pb-3 border-b bg-slate-50/50">
          <CardTitle className="text-base flex items-center gap-2">
            <Stethoscope className="h-4 w-4 text-slate-500" />
            Completed consultations
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
              {q.trim().length < 2 ? 'Type at least 2 characters to search consultations.' : 'No consultations match your search.'}
            </div>
          ) : (
            <div className="w-full overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[260px]">Patient</TableHead>
                    <TableHead className="w-[140px]">File No.</TableHead>
                    <TableHead>Surgeon</TableHead>
                    <TableHead className="w-[160px]">Consultation Date</TableHead>
                    <TableHead className="w-[140px]">Plan</TableHead>
                    <TableHead className="w-[170px] text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((c) => {
                    const patientName = `${c.patient.first_name} ${c.patient.last_name}`.trim();
                    const isReady = c.casePlan?.readyForSurgery ?? false;
                    return (
                      <TableRow key={c.consultationId}>
                        <TableCell className="py-3">
                          <div className="font-medium text-slate-900">{patientName}</div>
                        </TableCell>
                        <TableCell className="py-3">
                          <span className="text-xs font-mono text-slate-600">{c.patient.file_number || '—'}</span>
                        </TableCell>
                        <TableCell className="py-3">
                          <span className="text-sm text-slate-800">{c.doctor.name}</span>
                        </TableCell>
                        <TableCell className="py-3 text-sm text-slate-700">
                          {c.completedAt ? format(new Date(c.completedAt), 'MMM d, yyyy') : '—'}
                        </TableCell>
                        <TableCell className="py-3">
                          <Badge
                            variant="outline"
                            className={
                              isReady
                                ? 'border-emerald-200 bg-emerald-50 text-emerald-700 text-[10px]'
                                : 'text-[10px]'
                            }
                          >
                            {isReady ? 'Ready' : c.casePlan?.readinessStatus || 'None'}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-3 text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8"
                            onClick={() => createCase(c.consultationId)}
                            disabled={creating === c.consultationId}
                          >
                            {creating === c.consultationId ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              'Create case'
                            )}
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

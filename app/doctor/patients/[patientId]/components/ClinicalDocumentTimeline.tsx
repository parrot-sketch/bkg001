'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { format, parseISO, startOfDay, endOfDay } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DatePicker } from '@/components/ui/date-picker';
import type { VisitResponseDto } from '@/application/dtos/VisitResponseDto';
import { Pencil, FileText, ArrowUpDown, Calendar } from 'lucide-react';

interface ClinicalDocumentTimelineProps {
  patientId: string;
  visits: VisitResponseDto[];
}

const STATUS_STYLES: Record<string, string> = {
  COMPLETED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  IN_CONSULTATION: 'bg-violet-50 text-violet-700 border-violet-200',
  CHECKED_IN: 'bg-amber-50 text-amber-700 border-amber-200',
  READY_FOR_CONSULTATION: 'bg-amber-50 text-amber-700 border-amber-200',
  CONFIRMED: 'bg-sky-50 text-sky-700 border-sky-200',
  SCHEDULED: 'bg-slate-100 text-slate-600 border-slate-200',
  PENDING: 'bg-slate-100 text-slate-500 border-slate-200',
  PENDING_DOCTOR_CONFIRMATION: 'bg-slate-100 text-slate-500 border-slate-200',
  CANCELLED: 'bg-rose-50 text-rose-700 border-rose-200',
  NO_SHOW: 'bg-rose-50 text-rose-600 border-rose-200',
};

function prettyStatus(status: string): string {
  return status
    .toLowerCase()
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export function ClinicalDocumentTimeline({ patientId, visits }: ClinicalDocumentTimelineProps) {
  const [fromDate, setFromDate] = useState<Date | null>(null);
  const [toDate, setToDate] = useState<Date | null>(null);
  const [sortDir, setSortDir] = useState<'desc' | 'asc'>('desc');

  const rows = useMemo(() => {
    let list = [...(visits || [])];

    if (fromDate) {
      const from = startOfDay(fromDate);
      list = list.filter((v) => parseISO(v.date) >= from);
    }
    if (toDate) {
      const to = endOfDay(toDate);
      list = list.filter((v) => parseISO(v.date) <= to);
    }

    list.sort((a, b) => {
      const diff = parseISO(a.date).getTime() - parseISO(b.date).getTime();
      return sortDir === 'desc' ? -diff : diff;
    });

    return list;
  }, [visits, fromDate, toDate, sortDir]);

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-3">
        <div>
          <h2 className="text-base font-bold text-slate-900 tracking-tight">Clinical Chart Feed</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Past consultations &amp; visit history
          </p>
        </div>
      </div>

      {/* Filter / Sort toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-end gap-3">
        <div className="flex items-center gap-2">
          <DatePicker
            value={fromDate ?? undefined}
            onChange={(d) => setFromDate(d ?? null)}
            placeholder="From date"
            className="h-8 w-40 text-xs"
          />
          <span className="text-xs text-slate-400">–</span>
          <DatePicker
            value={toDate ?? undefined}
            onChange={(d) => setToDate(d ?? null)}
            placeholder="To date"
            className="h-8 w-40 text-xs"
          />
        </div>

        <Button
          variant="outline"
          size="sm"
          className="h-8 text-xs border-slate-200 text-slate-600"
          onClick={() => setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'))}
        >
          <ArrowUpDown className="h-3.5 w-3.5 mr-1.5" />
          {sortDir === 'desc' ? 'Newest first' : 'Oldest first'}
        </Button>

        {(fromDate || toDate) && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs text-slate-500"
            onClick={() => {
              setFromDate(null);
              setToDate(null);
            }}
          >
            Clear
          </Button>
        )}

        <span className="sm:ml-auto text-xs text-slate-400">
          {rows.length} record{rows.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Table */}
      {rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 bg-white border border-dashed border-slate-200 rounded">
          <Calendar className="h-8 w-8 text-slate-300 mb-3" />
          <p className="text-sm font-medium text-slate-600">No medical events recorded</p>
          <p className="text-xs text-slate-400 mt-1">
            {visits?.length ? 'No visits match the selected date range.' : 'Timeline is empty for this patient record.'}
          </p>
        </div>
      ) : (
        <div className="border border-slate-200 bg-white overflow-hidden rounded-lg">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                <th className="text-left px-4 py-2.5">Date</th>
                <th className="text-left px-4 py-2.5">Doctor</th>
                <th className="text-left px-4 py-2.5">Type</th>
                <th className="text-left px-4 py-2.5">Status</th>
                <th className="text-left px-4 py-2.5">Summary</th>
                <th className="text-right px-4 py-2.5">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((visit) => {
                const consultation = visit.consultation;
                const summary = consultation?.chiefComplaint?.replace(/<[^>]*>/g, '').trim();
                return (
                  <tr key={`visit-${visit.id}`} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-4 py-3 align-top whitespace-nowrap">
                      <div className="font-medium text-slate-800">
                        {format(parseISO(visit.date), 'MMM d, yyyy')}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">{visit.time}</div>
                    </td>
                    <td className="px-4 py-3 align-top text-slate-700">
                      {visit.doctor?.name || '—'}
                      {visit.doctor?.specialization && (
                        <div className="text-[10px] text-slate-400">{visit.doctor.specialization}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 align-top text-slate-600 capitalize">
                      {visit.type?.toLowerCase() || '—'}
                    </td>
                    <td className="px-4 py-3 align-top">
                      <Badge
                        variant="outline"
                        className={`text-[10px] font-medium border ${
                          STATUS_STYLES[visit.status] || 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}
                      >
                        {prettyStatus(visit.status)}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 align-top text-slate-600 max-w-[280px]">
                      <span className="line-clamp-2 text-xs">
                        {summary || (consultation ? 'Consultation recorded' : '—')}
                      </span>
                    </td>
                    <td className="px-4 py-3 align-top text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button asChild variant="ghost" size="sm" className="h-7 text-[11px] text-slate-500">
                          <Link href={`/doctor/patients/${patientId}/visits/${visit.id}`}>
                            <FileText className="h-3 w-3 mr-1" /> View
                          </Link>
                        </Button>
                        {consultation && (
                          <Button asChild size="sm" className="h-7 text-[11px] bg-slate-900 hover:bg-slate-800 text-white">
                            <Link href={`/doctor/consultations/${consultation.id}/edit?patientId=${patientId}`}>
                              <Pencil className="h-3 w-3 mr-1" /> Edit
                            </Link>
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

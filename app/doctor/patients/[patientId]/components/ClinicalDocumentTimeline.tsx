'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { format, parseISO, subDays, subMonths, startOfDay, endOfDay } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Pencil, FileText, ArrowUpDown, X, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { VisitResponseDto } from '@/application/dtos/VisitResponseDto';

interface ClinicalDocumentTimelineProps {
  patientId: string;
  visits: VisitResponseDto[];
}

type DateRange = 'all' | '7d' | '30d' | '3m' | '1y';

const STATUS_STYLES: Record<string, string> = {
  COMPLETED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  IN_CONSULTATION: 'bg-violet-50 text-violet-700 border-violetine-200',
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

const RANGE_OPTIONS: { key: DateRange; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: '7d', label: 'Last 7 days' },
  { key: '30d', label: 'Last 30 days' },
  { key: '3m', label: 'Last 3 months' },
  { key: '1y', label: 'This year' },
];

function getRangeBounds(range: DateRange): { from: Date; to: Date } | null {
  const now = new Date();
  switch (range) {
    case '7d':
      return { from: startOfDay(subDays(now, 7)), to: endOfDay(now) };
    case '30d':
      return { from: startOfDay(subDays(now, 30)), to: endOfDay(now) };
    case '3m':
      return { from: startOfDay(subMonths(now, 3)), to: endOfDay(now) };
    case '1y':
      return { from: startOfDay(new Date(now.getFullYear(), 0, 1)), to: endOfDay(now) };
    default:
      return null;
  }
}

interface GroupedVisits {
  label: string;
  visits: VisitResponseDto[];
}

function groupVisitsByMonth(visits: VisitResponseDto[]): GroupedVisits[] {
  const groups = new Map<string, VisitResponseDto[]>();
  for (const visit of visits) {
    const d = parseISO(visit.date);
    const key = format(d, 'MMMM yyyy');
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(visit);
  }
  return Array.from(groups.entries())
    .map(([label, visits]) => ({ label, visits }))
    .sort((a, b) => new Date(b.visits[0].date).getTime() - new Date(a.visits[0].date).getTime());
}

export function ClinicalDocumentTimeline({ patientId, visits }: ClinicalDocumentTimelineProps) {
  const [range, setRange] = useState<DateRange>('all');
  const [sortDir, setSortDir] = useState<'desc' | 'asc'>('desc');
  const [expandedVisits, setExpandedVisits] = useState<Set<number>>(new Set());

  const bounds = getRangeBounds(range);

  const filtered = useMemo(() => {
    let list = [...(visits || [])];
    if (bounds) {
      list = list.filter((v) => {
        const d = parseISO(v.date);
        return d >= bounds.from && d <= bounds.to;
      });
    }
    list.sort((a, b) => {
      const diff = parseISO(a.date).getTime() - parseISO(b.date).getTime();
      return sortDir === 'desc' ? -diff : diff;
    });
    return list;
  }, [visits, range, sortDir, bounds]);

  const grouped = useMemo(() => groupVisitsByMonth(filtered), [filtered]);

  const toggleVisit = (visitId: number) => {
    setExpandedVisits(prev => {
      const next = new Set(prev);
      if (next.has(visitId)) next.delete(visitId);
      else next.add(visitId);
      return next;
    });
  };

  const renderNotesPreview = (consultation: VisitResponseDto['consultation']) => {
    if (!consultation) return null;
    const fields = [
      { key: 'chiefComplaint', label: 'Subjective' },
      { key: 'examination', label: 'Objective' },
      { key: 'assessment', label: 'Assessment' },
      { key: 'plan', label: 'Plan' },
    ] as const;
    return fields.map(({ key, label }) => {
      const value = (consultation as any)[key]?.replace(/<[^>]*>/g, '').trim();
      if (!value) return null;
      return (
        <div key={key} className="space-y-0.5">
          <p className="text-[9px] font-bold uppercase tracking-wider text-[#2c2e4b]/40">{label}</p>
          <p className="text-xs text-[#2c2e4b]/80 leading-relaxed line-clamp-3">{value}</p>
        </div>
      );
    });
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#e7d6bf]/50 pb-3">
        <div>
          <h2 className="text-base font-bold text-[#2c2e4b] tracking-tight">Clinical Chart Feed</h2>
          <p className="text-xs text-[#2c2e4b]/40 mt-0.5">
            Past consultations &amp; visit history
          </p>
        </div>
      </div>

      {/* Filter / Sort toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex items-center gap-1.5 flex-wrap">
          {RANGE_OPTIONS.map((opt) => (
            <Button
              key={opt.key}
              variant={range === opt.key ? 'default' : 'outline'}
              size="sm"
              className={cn(
                'h-7 px-3 rounded-lg text-[11px] font-medium border transition-colors',
                range === opt.key
                  ? 'bg-[#2c2e4b] text-white border-[#2c2e4b]'
                  : 'border-[#e7d6bf] text-[#2c2e4b] hover:bg-[#e7d6bf]/10'
              )}
              onClick={() => setRange(opt.key)}
            >
              {opt.label}
            </Button>
          ))}
          {range !== 'all' && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-[11px] text-[#2c2e4b]/60 hover:text-[#2c2e4b] hover:bg-[#e7d6bf]/10 rounded-lg"
              onClick={() => setRange('all')}
            >
              <X className="h-3 w-3 mr-1" />
              Clear
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2 sm:ml-auto">
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-[11px] border-[#e7d6bf] text-[#2c2e4b] hover:bg-[#e7d6bf]/10 rounded-lg"
            onClick={() => setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'))}
          >
            <ArrowUpDown className="h-3.5 w-3.5 mr-1.5 text-[#2c2e4b]/60" />
            {sortDir === 'desc' ? 'Newest first' : 'Oldest first'}
          </Button>

          <span className="text-[11px] text-[#2c2e4b]/40 tabular-nums">
            {filtered.length} record{filtered.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Timeline */}
      {grouped.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 bg-white border border-dashed border-[#e7d6bf] rounded-xl">
          <div className="h-8 w-8 rounded-full border-2 border-[#e7d6bf] flex items-center justify-center mb-3">
            <span className="text-[#e7d6bf] text-xs font-bold">—</span>
          </div>
          <p className="text-sm font-medium text-[#2c2e4b]">No medical events recorded</p>
          <p className="text-xs text-[#2c2e4b]/40 mt-1">
            {visits?.length ? 'No visits match the selected time range.' : 'Timeline is empty for this patient record.'}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map((group) => (
            <div key={group.label} className="space-y-3">
              {/* Month header */}
              <div className="flex items-center gap-3">
                <h3 className="text-[11px] font-bold text-[#2c2e4b]/50 uppercase tracking-wider">
                  {group.label}
                </h3>
                <Separator className="flex-1 bg-[#e7d6bf]/50" />
                <span className="text-[10px] text-[#2c2e4b]/40 tabular-nums">
                  {group.visits.length} {group.visits.length === 1 ? 'visit' : 'visits'}
                </span>
              </div>

              {/* Visit cards */}
              <div className="border border-[#e7d6bf] bg-white overflow-hidden rounded-xl divide-y divide-[#e7d6bf]/50">
                {group.visits.map((visit) => {
                  const consultation = visit.consultation;
                  const summary = consultation?.chiefComplaint?.replace(/<[^>]*>/g, '').trim();
                  const billing = visit.billing;
                  const balance = billing ? billing.totalAmount - (billing.amountPaid + billing.discount) : 0;
                  const hasBalance = balance > 0;

                  return (
                    <div key={`visit-${visit.id}`} className="p-4 hover:bg-[#e7d6bf]/5 transition-colors">
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                        {/* Left: date, doctor, type, status */}
                        <div className="flex-1 min-w-0 space-y-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-semibold text-[#2c2e4b]">
                              {format(parseISO(visit.date), 'MMM d, yyyy')}
                            </span>
                            <span className="text-[10px] text-[#2c2e4b]/40 font-mono">{visit.time}</span>
                            <Badge
                              variant="outline"
                              className={cn(
                                'text-[10px] font-medium border rounded-md px-2 py-0.5',
                                STATUS_STYLES[visit.status] || 'bg-slate-100 text-slate-600 border-slate-200'
                              )}
                            >
                              {prettyStatus(visit.status)}
                            </Badge>
                            {hasBalance && (
                              <Badge variant="outline" className="text-[10px] font-medium border border-rose-200 bg-rose-50 text-rose-700">
                                Outstanding: KSh {balance.toLocaleString()}
                              </Badge>
                            )}
                          </div>

                          <div className="text-xs text-[#2c2e4b]/70">
                            {visit.doctor?.name || '—'}
                            {visit.doctor?.specialization && (
                              <span className="text-[#2c2e4b]/40 ml-1.5">{visit.doctor.specialization}</span>
                            )}
                            <span className="text-[#2c2e4b]/30 mx-2">·</span>
                            <span className="capitalize">{visit.type?.toLowerCase() || 'Visit'}</span>
                          </div>

                          {summary && (
                            <p className="text-xs text-[#2c2e4b]/60 line-clamp-2 leading-relaxed">
                              {summary}
                            </p>
                          )}

                          {/* Expandable SOAP notes preview — consultation only */}
                          {consultation && (
                            <div className="mt-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 text-[10px] text-[#2c2e4b]/60 hover:text-[#2c2e4b] hover:bg-[#e7d6bf]/10 rounded-lg"
                                onClick={() => toggleVisit(visit.id)}
                              >
                                <ChevronDown className={cn('h-3 w-3 mr-1 transition-transform', expandedVisits.has(visit.id) && 'rotate-180')} />
                                {expandedVisits.has(visit.id) ? 'Hide notes' : 'Show notes'}
                              </Button>
                              {expandedVisits.has(visit.id) && (
                                <div className="mt-2 p-3 bg-[#e7d6bf]/5 border border-[#e7d6bf]/30 rounded-lg space-y-2 animate-in fade-in duration-200">
                                  {renderNotesPreview(consultation)}
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Right: actions */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          <Button asChild variant="ghost" size="sm" className="h-7 text-[11px] text-[#2c2e4b]/60 hover:text-[#2c2e4b] hover:bg-[#e7d6bf]/10 rounded-lg">
                            <Link href={`/doctor/patients/${patientId}/visits/${visit.id}`}>
                              <FileText className="h-3.5 w-3.5 mr-1 text-[#2c2e4b]/60" /> View
                            </Link>
                          </Button>
                          {consultation && (
                            <Button asChild size="sm" className="h-7 text-[11px] bg-[#2c2e4b] hover:bg-[#2c2e4b]/90 text-white rounded-lg">
                              <Link href={`/doctor/consultations/${consultation.id}/edit?patientId=${patientId}`}>
                                <Pencil className="h-3 w-3 mr-1 text-white/80" /> Edit
                              </Link>
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

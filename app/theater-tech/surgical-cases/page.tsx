'use client';

/**
 * Theater Tech Surgical Cases Page
 *
 * Mobile: scrollable card list
 * Desktop (md+): full data table
 *
 * Both views have the same dual actions:
 *   - Tap/click row → case detail
 *   - Charges → charge sheet
 */

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Search, Receipt, ChevronRight, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';

// ─────────────────────────────────────────────────────────────────────────────
// Config
// ─────────────────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; pill: string }> = {
  DRAFT:                      { label: 'Draft',         pill: 'border border-slate-200 bg-slate-100 text-slate-600 ring-slate-200'      },
  PLANNING:                   { label: 'Planning',      pill: 'border border-amber-200 bg-amber-50 text-amber-700 ring-amber-200'      },
  READY_FOR_WARD_PREP:        { label: 'Ward Prep',     pill: 'border border-emerald-200 bg-emerald-50 text-emerald-700 ring-emerald-200' },
  IN_WARD_PREP:               { label: 'In Ward Prep',  pill: 'border border-amber-200 bg-amber-50 text-amber-700 ring-amber-200'      },
  READY_FOR_THEATER_BOOKING:  { label: 'Ready for Booking', pill: 'border border-slate-300 bg-slate-100 text-slate-700 ring-slate-300' },
  SCHEDULED:                  { label: 'Scheduled',     pill: 'border border-slate-300 bg-slate-100 text-slate-700 ring-slate-300'      },
  IN_PREP:                    { label: 'In Prep',       pill: 'border border-amber-200 bg-amber-50 text-amber-700 ring-amber-200'      },
  IN_THEATER:                 { label: 'In Theater',    pill: 'border border-red-200 bg-red-50 text-red-700 ring-red-200'              },
  RECOVERY:                   { label: 'Recovery',      pill: 'border border-emerald-200 bg-emerald-50 text-emerald-700 ring-emerald-200' },
  COMPLETED:                  { label: 'Completed',     pill: 'border border-emerald-200 bg-emerald-50 text-emerald-700 ring-emerald-200' },
  CANCELLED:                  { label: 'Cancelled',     pill: 'border border-red-200 bg-red-50 text-red-700 ring-red-200'              },
};

const STATUS_TABS = [
  { value: '',                                                                                    label: 'All'       },
  { value: 'DRAFT,PLANNING',                                                                     label: 'Planning'  },
  { value: 'READY_FOR_WARD_PREP,IN_WARD_PREP',                                                   label: 'Ward Prep' },
  { value: 'READY_FOR_THEATER_BOOKING,SCHEDULED',                                                label: 'Booking'   },
  { value: 'IN_PREP,IN_THEATER,RECOVERY',                                                        label: 'Live'      },
  { value: 'COMPLETED,CANCELLED',                                                                label: 'Done'      },
] as const;

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface SurgicalCaseItem {
  id: string;
  status: string;
  urgency: string;
  procedure_name: string | null;
  procedure_date: string | null;
  created_at: string;
  patient: { first_name: string; last_name: string; file_number: string | null };
  primary_surgeon: { name: string } | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────

export default function TheaterTechSurgicalCasesPage() {
  const router = useRouter();
  const [cases, setCases] = useState<SurgicalCaseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('');

  const fetchCases = useCallback(async () => {
    setLoading(true);
    try {
      const statusParam = activeTab ? `&status=${activeTab}` : '';
      const res = await fetch(`/api/theater-tech/surgical-cases/list?page=1${statusParam}`);
      const data = await res.json();
      if (data.success) setCases(data.data || []);
    } catch (err) {
      console.error('Error fetching cases:', err);
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => { fetchCases(); }, [fetchCases]);

  const filtered = cases.filter((c) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.patient.first_name.toLowerCase().includes(q) ||
      c.patient.last_name.toLowerCase().includes(q) ||
      c.patient.file_number?.toLowerCase().includes(q) ||
      c.procedure_name?.toLowerCase().includes(q) ||
      c.primary_surgeon?.name.toLowerCase().includes(q)
    );
  });

  const toDetail = (id: string) => router.push(`/theater-tech/surgical-cases/${id}`);
  const toCharges = (id: string) => router.push(`/theater-tech/surgical-cases/${id}/charges`);

  return (
    <div className="space-y-4">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Surgical Cases</h1>
          <p className="text-sm text-slate-500">Track each case from planning through booking and live theater flow.</p>
        </div>
        <span className="text-xs bg-white border border-slate-200 text-slate-500 px-2.5 py-1 rounded-full tabular-nums">
          {filtered.length} {filtered.length === 1 ? 'case' : 'cases'}
        </span>
      </div>

      {/* ── Status Tabs (horizontal scroll, no wrap) ── */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveTab(tab.value)}
            className={cn(
              'px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors touch-manipulation',
              activeTab === tab.value
                ? 'border border-slate-900 bg-slate-900 text-white shadow-sm'
                : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-100'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Search ── */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
        <Input
          placeholder="Search patient, file no., procedure or surgeon…"
          className="pl-9 h-10 md:h-9 bg-white touch-manipulation"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* ══════════════════════════════════════════════════════ */}
      {/* MOBILE CARD LIST (hidden on md+)                      */}
      {/* ══════════════════════════════════════════════════════ */}
      <div className="md:hidden border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
        {loading ? (
          <div className="p-4 space-y-3">
            {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-20 rounded-lg" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-14 text-slate-400 text-sm">
            {searchQuery ? 'No cases match your search.' : 'No surgical cases found.'}
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filtered.map((c) => {
              const cfg = STATUS_CONFIG[c.status] ?? { label: c.status, pill: 'bg-slate-100 text-slate-600 ring-slate-200' };
              return (
                <div key={c.id} className="flex items-center gap-3 px-4 py-3.5 active:bg-slate-50">
                  {/* Avatar */}
                  <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                    <User className="h-4 w-4 text-slate-400" />
                  </div>

                  {/* Info — tappable */}
                  <button
                    type="button"
                    className="flex-1 min-w-0 text-left touch-manipulation py-0.5"
                    onClick={() => toDetail(c.id)}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-slate-900 truncate">
                        {c.patient.first_name} {c.patient.last_name}
                      </p>
                      <span className={cn('text-[10px] font-medium px-2 py-0.5 rounded-full ring-1 ring-inset shrink-0', cfg.pill)}>
                        {cfg.label}
                      </span>
                    </div>
                    {c.patient.file_number && (
                      <p className="text-[11px] text-slate-400 font-mono mt-0.5">{c.patient.file_number}</p>
                    )}
                    <p className="text-xs text-slate-500 mt-0.5 truncate">
                      {c.procedure_name ?? <span className="italic text-slate-400">No procedure</span>}
                      {c.procedure_date &&
                        ` · ${format(new Date(c.procedure_date), 'MMM d')}`}
                    </p>
                  </button>

                  {/* Charges icon */}
                  <button
                    type="button"
                    onClick={() => toCharges(c.id)}
                    className="h-9 w-9 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors touch-manipulation shrink-0"
                    title="Charge Sheet"
                  >
                    <Receipt className="h-4 w-4" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════ */}
      {/* DESKTOP TABLE (hidden below md)                       */}
      {/* ══════════════════════════════════════════════════════ */}
      <div className="hidden md:block border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse min-w-[700px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Patient</th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 w-28">File No.</th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Procedure</th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 w-36">Surgeon</th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 w-28">Date</th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 w-28">Status</th>
                <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 w-32">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 7 }).map((__, j) => (
                      <td key={j} className="px-4 py-3.5">
                        <Skeleton className="h-4 rounded" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-16 text-slate-400 text-sm">
                    {searchQuery ? 'No cases match your search.' : 'No surgical cases found.'}
                  </td>
                </tr>
              ) : (
                filtered.map((c) => {
                  const cfg = STATUS_CONFIG[c.status] ?? { label: c.status, pill: 'bg-slate-100 text-slate-600 ring-slate-200' };
                  return (
                    <tr
                      key={c.id}
                      onClick={() => toDetail(c.id)}
                      className="hover:bg-slate-50/70 cursor-pointer transition-colors group"
                    >
                      <td className="px-4 py-3.5 font-medium text-slate-900 group-hover:text-slate-700">
                        {c.patient.first_name} {c.patient.last_name}
                      </td>
                      <td className="px-4 py-3.5 font-mono text-xs text-slate-500">
                        {c.patient.file_number ?? '—'}
                      </td>
                      <td className="px-4 py-3.5 text-slate-600 max-w-[180px] truncate">
                        {c.procedure_name ?? <span className="italic text-slate-400">Not set</span>}
                      </td>
                      <td className="px-4 py-3.5 text-slate-600 truncate">
                        {c.primary_surgeon?.name ?? <span className="text-slate-400">—</span>}
                      </td>
                      <td className="px-4 py-3.5 tabular-nums text-slate-500 whitespace-nowrap">
                        {c.procedure_date
                          ? format(new Date(c.procedure_date), 'MMM d, yyyy')
                          : <span className="text-slate-400">—</span>}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ring-1 ring-inset', cfg.pill)}>
                          {cfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs text-slate-500 hover:text-slate-800 gap-1"
                            onClick={() => toCharges(c.id)}
                          >
                            <Receipt className="h-3.5 w-3.5" />
                            Charges
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-slate-400 hover:text-slate-700"
                            onClick={() => toDetail(c.id)}
                          >
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {!loading && filtered.length > 0 && (
          <div className="px-4 py-2.5 border-t border-slate-100 bg-slate-50/50 text-xs text-slate-400 tabular-nums">
            Showing {filtered.length} of {cases.length} cases
          </div>
        )}
      </div>

    </div>
  );
}

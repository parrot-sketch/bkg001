'use client';

/**
 * Theater Tech Surgical Cases Page
 * 
 * Clean, modern surgical case listing with compact, well-organized UI.
 * Organized by status tabs with inline actions.
 */

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import {
  Search,
  Calendar,
  User,
  Eye,
  Scissors,
  Clock,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  DRAFT: { label: 'Draft', color: 'text-slate-700', bg: 'bg-slate-100' },
  PLANNING: { label: 'Planning', color: 'text-blue-700', bg: 'bg-blue-50' },
  READY_FOR_WARD_PREP: { label: 'Ward Prep', color: 'text-cyan-700', bg: 'bg-cyan-50' },
  IN_WARD_PREP: { label: 'Ward Prep', color: 'text-teal-700', bg: 'bg-teal-50' },
  READY_FOR_THEATER_BOOKING: { label: 'Ready', color: 'text-indigo-700', bg: 'bg-indigo-50' },
  READY_FOR_THEATER_PREP: { label: 'Prep', color: 'text-violet-700', bg: 'bg-violet-50' },
  SCHEDULED: { label: 'Scheduled', color: 'text-purple-700', bg: 'bg-purple-50' },
  IN_PREP: { label: 'In Prep', color: 'text-amber-700', bg: 'bg-amber-50' },
  IN_THEATER: { label: 'In Theater', color: 'text-red-700', bg: 'bg-red-50' },
  RECOVERY: { label: 'Recovery', color: 'text-emerald-700', bg: 'bg-emerald-50' },
  COMPLETED: { label: 'Done', color: 'text-green-700', bg: 'bg-green-50' },
  CANCELLED: { label: 'Cancelled', color: 'text-slate-500', bg: 'bg-slate-100' },
};

const STATUS_TABS = [
  { value: '', label: 'All' },
  { value: 'DRAFT,PLANNING', label: 'Planning' },
  { value: 'READY_FOR_WARD_PREP,IN_WARD_PREP,READY_FOR_THEATER_BOOKING,READY_FOR_THEATER_PREP', label: 'Prep' },
  { value: 'SCHEDULED,IN_PREP', label: 'Scheduled' },
  { value: 'IN_THEATER,RECOVERY', label: 'Active' },
  { value: 'COMPLETED,CANCELLED', label: 'Done' },
] as const;

interface SurgicalCaseItem {
  id: string;
  status: string;
  urgency: string;
  procedure_name: string | null;
  procedure_date: string | null;
  created_at: string;
  patient: {
    first_name: string;
    last_name: string;
    file_number: string | null;
  };
  primary_surgeon: {
    name: string;
  } | null;
}

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
      if (data.success) {
        setCases(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching cases:', error);
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchCases();
  }, [fetchCases]);

  const filteredCases = cases.filter(c => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      c.patient.first_name.toLowerCase().includes(query) ||
      c.patient.last_name.toLowerCase().includes(query) ||
      c.patient.file_number?.toLowerCase().includes(query) ||
      c.procedure_name?.toLowerCase().includes(query)
    );
  });

  const handleViewPlan = (caseId: string, status: string) => {
    // For DRAFT/PLANNING go to edit mode, otherwise view document
    if (status === 'DRAFT' || status === 'PLANNING') {
      router.push(`/theater-tech/surgical-cases/${caseId}/edit`);
    } else {
      router.push(`/theater-tech/surgical-cases/${caseId}/plan`);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">Surgical Cases</h1>
          <p className="text-sm text-slate-500">Manage and track cases</p>
        </div>
        <Badge variant="outline" className="text-xs bg-white self-start sm:self-auto">
          {filteredCases.length} cases
        </Badge>
      </div>

      {/* Status Tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-2 -mx-2 px-2">
        {STATUS_TABS.map(tab => (
          <button
            key={tab.value}
            onClick={() => { setActiveTab(tab.value); }}
            className={cn(
              "px-2.5 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors touch-manipulation",
              activeTab === tab.value
                ? "bg-slate-900 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input
          placeholder="Search patients or procedures..."
          className="pl-9 h-10 sm:h-9 bg-white touch-manipulation"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
        />
      </div>

{/* Mobile Card View - Touch-friendly targets */}
      <Card className="border-slate-200 shadow-sm">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-4 space-y-2">
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="h-20" />
              ))}
            </div>
          ) : filteredCases.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              {searchQuery ? 'No cases match your search' : 'No surgical cases found'}
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredCases.map(surgicalCase => {
                const statusCfg = STATUS_CONFIG[surgicalCase.status] || { label: surgicalCase.status, color: 'text-slate-600', bg: 'bg-slate-100' };
                return (
                  <button
                    key={surgicalCase.id}
                    onClick={() => handleViewPlan(surgicalCase.id, surgicalCase.status)}
                    className="w-full text-left p-4 hover:bg-slate-50 active:bg-slate-100 transition-colors touch-manipulation min-h-[80px]"
                  >
                    <div className="flex items-start gap-3">
                      <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                        <User className="h-5 w-5 text-slate-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <p className="font-medium text-slate-900 truncate">
                            {surgicalCase.patient.first_name} {surgicalCase.patient.last_name}
                          </p>
                          <span className={cn("text-[10px] px-2 py-0.5 rounded font-medium shrink-0", statusCfg.bg, statusCfg.color)}>
                            {statusCfg.label}
                          </span>
                        </div>
                        {surgicalCase.patient.file_number && (
                          <p className="text-xs text-slate-400 font-mono mb-1">{surgicalCase.patient.file_number}</p>
                        )}
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <span className="truncate">{surgicalCase.procedure_name || 'No procedure'}</span>
                          {surgicalCase.procedure_date && (
                            <>
                              <span className="text-slate-300">|</span>
                              <span className="shrink-0">{format(new Date(surgicalCase.procedure_date), 'MMM d')}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">Surgical Cases</h1>
          <p className="text-sm text-slate-500">Manage and track cases</p>
        </div>
        <Badge variant="outline" className="text-xs bg-white">
          {filteredCases.length} cases
        </Badge>
      </div>

      {/* Status Tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1">
        {STATUS_TABS.map(tab => (
          <button
            key={tab.value}
            onClick={() => { setActiveTab(tab.value); }}
            className={cn(
              "px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors",
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
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input
          placeholder="Search patients or procedures..."
          className="pl-9 h-9 bg-white"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Cases Table */}
      <Card className="border-slate-200 shadow-sm">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-4 space-y-2">
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="h-12" />
              ))}
            </div>
          ) : filteredCases.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              {searchQuery ? 'No cases match your search' : 'No surgical cases found'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left text-xs font-medium text-slate-500 px-4 py-2.5">Patient</th>
                    <th className="text-left text-xs font-medium text-slate-500 px-4 py-2.5 hidden md:table-cell">Surgeon</th>
                    <th className="text-left text-xs font-medium text-slate-500 px-4 py-2.5 hidden lg:table-cell">Procedure</th>
                    <th className="text-left text-xs font-medium text-slate-500 px-4 py-2.5 hidden sm:table-cell">Date</th>
                    <th className="text-left text-xs font-medium text-slate-500 px-4 py-2.5">Status</th>
                    <th className="text-right text-xs font-medium text-slate-500 px-4 py-2.5">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredCases.map(surgicalCase => {
                    const statusCfg = STATUS_CONFIG[surgicalCase.status] || { label: surgicalCase.status, color: 'text-slate-600', bg: 'bg-slate-100' };
                    return (
                      <tr key={surgicalCase.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-2.5">
                            <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center">
                              <User className="h-4 w-4 text-slate-500" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-slate-900">
                                {surgicalCase.patient.first_name} {surgicalCase.patient.last_name}
                              </p>
                              <p className="text-xs text-slate-400">
                                {surgicalCase.patient.file_number || '—'}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-2.5 hidden md:table-cell">
                          <span className="text-sm text-slate-600">
                            {surgicalCase.primary_surgeon?.name || '—'}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 hidden lg:table-cell">
                          <span className="text-sm text-slate-600">
                            {surgicalCase.procedure_name || '—'}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 hidden sm:table-cell">
                          <div className="flex items-center gap-1.5 text-slate-500">
                            <Calendar className="h-3.5 w-3.5" />
                            <span className="text-sm">
                              {surgicalCase.procedure_date 
                                ? format(new Date(surgicalCase.procedure_date), 'MMM d, yyyy')
                                : '—'}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-2.5">
                          <Badge className={cn("text-xs font-medium", statusCfg.bg, statusCfg.color)}>
                            {statusCfg.label}
                          </Badge>
                        </td>
                        <td className="px-4 py-2.5">
                          <div className="flex justify-end">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              className="h-8 text-xs gap-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                              onClick={() => handleViewPlan(surgicalCase.id, surgicalCase.status)}
                            >
                              {surgicalCase.status === 'DRAFT' || surgicalCase.status === 'PLANNING' ? (
                                <Scissors className="h-3 w-3" />
                              ) : (
                                <Eye className="h-3 w-3" />
                              )}
                              {surgicalCase.status === 'DRAFT' || surgicalCase.status === 'PLANNING' ? 'Plan' : 'View'}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
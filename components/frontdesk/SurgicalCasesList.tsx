'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Search,
  CalendarIcon,
  Plus,
  RefreshCw,
  Edit3,
  Trash2,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  Eye,
  Receipt,
} from 'lucide-react';
import { format } from 'date-fns';
import { frontdeskApi } from '@/lib/api/frontdesk';
import { queryKeys } from '@/lib/constants/queryKeys';
import { ScheduleProcedureDialog } from '@/components/frontdesk/ScheduleProcedureDialog';
import { EditSurgicalCaseDialog } from '@/components/frontdesk/EditSurgicalCaseDialog';
import type { FrontdeskSurgicalCaseListItem } from '@/lib/api/frontdesk';

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  DRAFT: { label: 'Draft', className: 'border border-slate-300 bg-slate-100 text-slate-700' },
  PLANNING: { label: 'Planning', className: 'border border-amber-300 bg-amber-100 text-amber-800' },
  READY_FOR_SCHEDULING: { label: 'Ready for Scheduling', className: 'border border-blue-300 bg-blue-100 text-blue-800' },
  READY_FOR_WARD_PREP: { label: 'Ward Prep', className: 'border border-emerald-300 bg-emerald-100 text-emerald-800' },
  IN_WARD_PREP: { label: 'In Ward Prep', className: 'border border-amber-300 bg-amber-100 text-amber-800' },
  READY_FOR_THEATER_BOOKING: { label: 'Ready for Booking', className: 'border border-slate-300 bg-slate-100 text-slate-700' },
  SCHEDULED: { label: 'Scheduled', className: 'border border-indigo-300 bg-indigo-100 text-indigo-800' },
  IN_PREP: { label: 'In Prep', className: 'border border-amber-300 bg-amber-100 text-amber-800' },
  IN_THEATER: { label: 'In Theater', className: 'border border-red-300 bg-red-100 text-red-800' },
  RECOVERY: { label: 'Recovery', className: 'border border-emerald-300 bg-emerald-100 text-emerald-800' },
  COMPLETED: { label: 'Completed', className: 'border border-emerald-300 bg-emerald-100 text-emerald-800' },
  CANCELLED: { label: 'Cancelled', className: 'border border-red-300 bg-red-100 text-red-800' },
};

export interface SurgicalCaseAction {
  key: string;
  label: string;
  icon?: React.ElementType;
  className?: string;
  disabled?: boolean;
  onClick: (caseItem: FrontdeskSurgicalCaseListItem) => void;
}

export interface SurgicalCasesListProps {
  title?: string;
  description?: string;
  showScheduleButton?: boolean;
  onScheduleSuccess?: (caseId?: string) => void;
  statusFilterOptions?: { value: string; label: string }[];
  rowActions?: (caseItem: FrontdeskSurgicalCaseListItem, canEdit: boolean, canDelete: boolean) => SurgicalCaseAction[];
  detailHref?: (caseItem: FrontdeskSurgicalCaseListItem) => string;
  onDeleteSuccess?: () => void;
}

export function SurgicalCasesList({
  title = 'Surgical Cases',
  description = 'Create and manage scheduled surgical procedures',
  showScheduleButton = true,
  onScheduleSuccess,
  statusFilterOptions,
  rowActions,
  detailHref = (c) => `/frontdesk/surgical-cases/${c.id}`,
  onDeleteSuccess,
}: SurgicalCasesListProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [editingCase, setEditingCase] = useState<FrontdeskSurgicalCaseListItem | null>(null);

  useEffect(() => {
    if (searchTimerRef.current) {
      clearTimeout(searchTimerRef.current);
    }
    searchTimerRef.current = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
    }, 300);

    return () => {
      if (searchTimerRef.current) {
        clearTimeout(searchTimerRef.current);
      }
    };
  }, [searchQuery]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, statusFilter]);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: queryKeys.shared.surgicalCases({ status: statusFilter, search: debouncedSearch }),
    queryFn: async () => {
      const response = await frontdeskApi.getSurgicalCases({
        page,
        limit,
        status: statusFilter === 'ALL' ? undefined : statusFilter,
        search: debouncedSearch || undefined,
      });
      if (response.success === false) {
        throw new Error((response as any).error || 'Failed to load surgical cases');
      }
      if (!response.data) {
        throw new Error('No data received');
      }
      return response.data;
    },
    staleTime: 30_000,
  });

  const deleteMutation = useMutation({
    mutationFn: async (caseId: string) => {
      const response = await frontdeskApi.deleteSurgicalCase(caseId);
      if (response.success === false) {
        throw new Error((response as any).error || 'Failed to delete case');
      }
      return caseId;
    },
    onSuccess: () => {
      toast.success('Surgical case deleted');
      queryClient.invalidateQueries({ queryKey: [queryKeys.shared.all, 'surgical-cases'] });
      onDeleteSuccess?.();
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to delete case'),
  });

  const cases = data?.data || [];
  const totalPages = data?.totalPages || 1;
  const total = data?.total || 0;

  const filteredCases = useMemo(() => {
    if (!cases) return [];
    return cases;
  }, [cases]);

  const handleDelete = (caseItem: FrontdeskSurgicalCaseListItem) => {
    if (!confirm(`Delete surgical case for ${caseItem.patient.first_name} ${caseItem.patient.last_name}?`)) return;
    deleteMutation.mutate(caseItem.id);
  };

  const defaultActions = (caseItem: FrontdeskSurgicalCaseListItem, canEdit: boolean, canDelete: boolean) => {
    const actions: SurgicalCaseAction[] = [
      {
        key: 'view',
        label: 'View',
        icon: Eye,
        onClick: () => router.push(detailHref(caseItem)),
      },
    ];
    if (canEdit) {
      actions.push({
        key: 'edit',
        label: 'Edit',
        icon: Edit3,
        onClick: () => setEditingCase(caseItem),
      });
    }
    if (canDelete) {
      actions.push({
        key: 'delete',
        label: 'Delete',
        icon: Trash2,
        className: 'text-red-600',
        onClick: () => handleDelete(caseItem),
      });
    }
    return actions;
  };

  const availableActions = rowActions || defaultActions;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">{title}</h1>
          <p className="text-sm text-white/60 mt-1">{description}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} className="bg-white/90 hover:bg-white text-[#2c2e4b] border-[#e7d6bf]">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          {showScheduleButton && (
            <Button size="sm" onClick={() => setScheduleOpen(true)} className="bg-[#caa26a] hover:bg-[#b8913e] text-white font-bold shadow-sm">
              <Plus className="h-4 w-4 mr-2" />
              Schedule Procedure
            </Button>
          )}
        </div>
      </div>

      <Card className="bg-white/95 backdrop-blur border-[#e7d6bf] shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <CardTitle className="text-base text-[#2c2e4b]">All Cases</CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[#2c2e4b]/40" />
                <Input
                  placeholder="Search patient, file number, procedure..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 w-64 bg-white border-[#e7d6bf]"
                />
              </div>
              {statusFilterOptions ? (
                <select
                  value={statusFilter}
                  onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                  className="h-9 px-3 rounded-md border border-[#e7d6bf] bg-white text-sm text-[#2c2e4b]"
                >
                  {statusFilterOptions.map((tab) => (
                    <option key={tab.value} value={tab.value}>{tab.label}</option>
                  ))}
                </select>
              ) : (
                <select
                  value={statusFilter}
                  onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                  className="h-9 px-3 rounded-md border border-[#e7d6bf] bg-white text-sm text-[#2c2e4b]"
                >
                  <option value="ALL">All statuses</option>
                  {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                    <option key={key} value={key}>{cfg.label}</option>
                  ))}
                </select>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="text-center py-8 text-red-600 bg-red-50 rounded-lg">
              {error instanceof Error ? error.message : 'Failed to load cases'}
            </div>
          )}

          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full bg-[#e7d6bf]/30" />
              ))}
            </div>
          ) : filteredCases.length === 0 ? (
            <div className="text-center py-12 text-[#2c2e4b]/60">
              <CalendarIcon className="h-10 w-10 mx-auto mb-3 text-[#e7d6bf]" />
              <p className="text-sm font-medium text-[#2c2e4b]">No surgical cases found</p>
              <p className="text-xs text-[#2c2e4b]/50 mt-1">
                {statusFilter !== 'ALL' || searchQuery ? 'Try adjusting your filters' : 'Get started by scheduling your first procedure'}
              </p>
              {showScheduleButton && (
                <Button
                  variant="link"
                  className="mt-3 text-[#caa26a] hover:text-[#b8913e]"
                  onClick={() => setScheduleOpen(true)}
                >
                  Schedule a procedure
                </Button>
              )}
            </div>
          ) : (
            <>
              <div className="rounded-md border border-[#e7d6bf] overflow-hidden">
                <Table>
                  <TableHeader className="bg-[#e7d6bf]/20">
                    <TableRow>
                      <TableHead className="text-[#2c2e4b]/70">Patient</TableHead>
                      <TableHead className="text-[#2c2e4b]/70">Procedure</TableHead>
                      <TableHead className="text-[#2c2e4b]/70">Surgeon</TableHead>
                      <TableHead className="text-[#2c2e4b]/70">Date</TableHead>
                      <TableHead className="text-[#2c2e4b]/70">Status</TableHead>
                      <TableHead className="text-right text-[#2c2e4b]/70">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCases.map((c) => {
                      const statusCfg = STATUS_CONFIG[c.status] || { label: c.status, className: 'border border-slate-300 bg-slate-100 text-slate-700' };
                      const canEdit = ['DRAFT', 'PLANNING', 'READY_FOR_SCHEDULING', 'READY_FOR_WARD_PREP', 'IN_WARD_PREP'].includes(c.status);
                      const canDelete = canEdit;
                      const surgeonName = c.primary_surgeon?.name || c.primary_surgeon_name || '—';
                      const actions = availableActions(c, canEdit, canDelete);

                      return (
                        <TableRow key={c.id} className="hover:bg-[#e7d6bf]/10 cursor-pointer" onClick={() => router.push(detailHref(c))}>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-medium text-[#2c2e4b] underline underline-offset-2">
                                {c.patient.first_name} {c.patient.last_name}
                              </span>
                              {c.patient.file_number && (
                                <span className="text-xs text-[#2c2e4b]/50 font-mono">#{c.patient.file_number}</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="text-sm text-[#2c2e4b] underline underline-offset-2">{c.procedure_name || 'Unnamed procedure'}</span>
                              {c.diagnosis && (
                                <span className="text-xs text-[#2c2e4b]/50 truncate max-w-[200px]" title={c.diagnosis}>{c.diagnosis}</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-[#2c2e4b]/80">{surgeonName}</span>
                            {c.primary_surgeon?.specialization && (
                              <span className="text-xs text-[#2c2e4b]/50 block">{c.primary_surgeon.specialization}</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {c.procedure_date ? (
                              <span className="text-sm text-[#2c2e4b]/80">
                                {format(new Date(c.procedure_date), 'MMM d, yyyy')}
                              </span>
                            ) : (
                              <span className="text-sm text-[#2c2e4b]/40">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium border ${statusCfg.className}`}>
                              {statusCfg.label}
                            </span>
                          </TableCell>
                          <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                  <MoreVertical className="h-4 w-4 text-[#2c2e4b]/50" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {actions.map((action) => (
                                  <DropdownMenuItem
                                    key={action.key}
                                    onClick={() => action.onClick(c)}
                                    disabled={action.disabled}
                                    className={action.className}
                                  >
                                    {action.icon && <action.icon className="h-4 w-4 mr-2" />}
                                    {action.label}
                                  </DropdownMenuItem>
                                ))}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-4">
                  <p className="text-xs text-[#2c2e4b]/60">
                    Page {page} of {totalPages} ({total} total)
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page <= 1}
                      onClick={() => setPage((p) => p - 1)}
                      className="bg-white border-[#e7d6bf] text-[#2c2e4b] hover:bg-[#e7d6bf]/20"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page >= totalPages}
                      onClick={() => setPage((p) => p + 1)}
                      className="bg-white border-[#e7d6bf] text-[#2c2e4b] hover:bg-[#e7d6bf]/20"
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <ScheduleProcedureDialog
        open={scheduleOpen}
        onOpenChange={setScheduleOpen}
        onSuccess={(data) => {
          queryClient.invalidateQueries({ queryKey: [queryKeys.shared.all, 'surgical-cases'] });
          onScheduleSuccess?.(data.surgicalCaseId);
        }}
      />

      {editingCase && (
        <EditSurgicalCaseDialog
          open={!!editingCase}
          caseItem={editingCase}
          onOpenChange={(open) => {
            if (!open) setEditingCase(null);
          }}
          onSuccess={() => {
            setEditingCase(null);
            queryClient.invalidateQueries({ queryKey: [queryKeys.shared.all, 'surgical-cases'] });
          }}
        />
      )}
    </div>
  );
}

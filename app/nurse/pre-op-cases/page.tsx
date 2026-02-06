'use client';

/**
 * Nurse Pre-Op Cases Dashboard
 *
 * View and manage surgical cases pending pre-operative readiness work.
 * This is the primary interface for nurses to track and complete pre-op tasks.
 */

import { useState, useMemo } from 'react';
import { useAuth } from '@/hooks/patient/useAuth';
import { usePreOpCases, useMarkCaseReady } from '@/hooks/nurse/usePreOpCases';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Activity,
  Search,
  CheckCircle2,
  AlertCircle,
  Clock,
  User2,
  Stethoscope,
  Camera,
  FileSignature,
  ClipboardList,
  Calendar,
  ChevronRight,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';
import { format, formatDistanceToNow } from 'date-fns';
import Link from 'next/link';
import type { PreOpSurgicalCase } from '@/lib/api/nurse';

/**
 * Status badge component for surgical case status
 */
function StatusBadge({ status }: { status: string }) {
  const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
    DRAFT: { label: 'Draft', variant: 'secondary' },
    PLANNING: { label: 'Planning', variant: 'default' },
    READY_FOR_SCHEDULING: { label: 'Ready', variant: 'default' },
    SCHEDULED: { label: 'Scheduled', variant: 'outline' },
  };

  const config = statusConfig[status] || { label: status, variant: 'secondary' };

  return <Badge variant={config.variant}>{config.label}</Badge>;
}

/**
 * Urgency badge component
 */
function UrgencyBadge({ urgency }: { urgency: string }) {
  const urgencyConfig: Record<string, { label: string; className: string }> = {
    ELECTIVE: { label: 'Elective', className: 'bg-slate-100 text-slate-700' },
    URGENT: { label: 'Urgent', className: 'bg-amber-100 text-amber-700' },
    EMERGENCY: { label: 'Emergency', className: 'bg-red-100 text-red-700' },
  };

  const config = urgencyConfig[urgency] || { label: urgency, className: 'bg-slate-100' };

  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${config.className}`}>
      {config.label}
    </span>
  );
}

/**
 * Readiness checklist item component
 */
function ReadinessItem({
  label,
  complete,
  icon: Icon,
}: {
  label: string;
  complete: boolean;
  icon: React.ElementType;
}) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger>
          <div
            className={`flex items-center justify-center w-8 h-8 rounded-full ${
              complete ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'
            }`}
          >
            {complete ? <CheckCircle2 className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>
            {label}: {complete ? 'Complete' : 'Pending'}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * Pre-Op Case Card Component
 */
function PreOpCaseCard({ surgicalCase }: { surgicalCase: PreOpSurgicalCase }) {
  const markReady = useMarkCaseReady();
  const readiness = surgicalCase.readiness;

  const handleMarkReady = () => {
    if (!readiness.isReady) {
      toast.error('Cannot mark as ready - missing required items');
      return;
    }
    markReady.mutate(surgicalCase.id, {
      onSuccess: () => toast.success('Case marked as ready for scheduling'),
      onError: (error) => toast.error(error.message),
    });
  };

  return (
    <Card className="group hover:shadow-md transition-shadow duration-200">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          {/* Patient Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-base truncate">
                {surgicalCase.patient?.fullName || 'Unknown Patient'}
              </h3>
              <StatusBadge status={surgicalCase.status} />
              <UrgencyBadge urgency={surgicalCase.urgency} />
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
              {surgicalCase.patient?.fileNumber && (
                <span className="flex items-center gap-1">
                  <User2 className="w-3.5 h-3.5" />
                  {surgicalCase.patient.fileNumber}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Stethoscope className="w-3.5 h-3.5" />
                {surgicalCase.primarySurgeon?.name || 'Unassigned'}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {formatDistanceToNow(new Date(surgicalCase.createdAt), { addSuffix: true })}
              </span>
            </div>

            {/* Procedure Info */}
            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3 mb-3">
              <p className="text-sm font-medium">
                {surgicalCase.procedureName || 'Procedure not specified'}
              </p>
              {surgicalCase.diagnosis && (
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                  {surgicalCase.diagnosis}
                </p>
              )}
            </div>

            {/* Readiness Progress */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Readiness</span>
                <span
                  className={`font-medium ${
                    readiness.percentage === 100
                      ? 'text-emerald-600'
                      : readiness.percentage >= 50
                        ? 'text-amber-600'
                        : 'text-slate-500'
                  }`}
                >
                  {readiness.percentage}%
                </span>
              </div>
              <Progress
                value={readiness.percentage}
                className={`h-2 ${readiness.percentage === 100 ? '[&>div]:bg-emerald-500' : ''}`}
              />
            </div>

            {/* Readiness Checklist Icons */}
            <div className="flex items-center gap-2 mt-3">
              <ReadinessItem
                label="Pre-op Intake"
                complete={readiness.intakeFormComplete}
                icon={ClipboardList}
              />
              <ReadinessItem
                label="Medical History"
                complete={readiness.medicalHistoryComplete}
                icon={Activity}
              />
              <ReadinessItem
                label="Clinical Photos"
                complete={readiness.photosUploaded}
                icon={Camera}
              />
              <ReadinessItem
                label="Consent Form"
                complete={readiness.consentSigned}
                icon={FileSignature}
              />
              <ReadinessItem
                label="Procedure Plan"
                complete={readiness.procedurePlanComplete}
                icon={Calendar}
              />
            </div>

            {/* Missing Items */}
            {readiness.missingItems.length > 0 && (
              <div className="flex items-start gap-2 mt-3 text-xs text-amber-600 dark:text-amber-500">
                <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                <span>Missing: {readiness.missingItems.join(', ')}</span>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2">
            <Button asChild size="sm" variant="outline">
              <Link href={`/nurse/pre-op-cases/${surgicalCase.id}`}>
                View Details
                <ChevronRight className="w-4 h-4 ml-1" />
              </Link>
            </Button>
            {readiness.isReady && surgicalCase.status !== 'READY_FOR_SCHEDULING' && (
              <Button
                size="sm"
                onClick={handleMarkReady}
                disabled={markReady.isPending}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                <CheckCircle2 className="w-4 h-4 mr-1" />
                Mark Ready
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Summary Stats Component
 */
function SummaryStats({
  summary,
}: {
  summary: { total: number; ready: number; pending: number; byStatus: { draft: number; planning: number } };
}) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Cases</p>
              <p className="text-2xl font-bold">{summary.total}</p>
            </div>
            <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center">
              <Activity className="h-5 w-5 text-slate-600" />
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Ready</p>
              <p className="text-2xl font-bold text-emerald-600">{summary.ready}</p>
            </div>
            <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Pending</p>
              <p className="text-2xl font-bold text-amber-600">{summary.pending}</p>
            </div>
            <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center">
              <Clock className="h-5 w-5 text-amber-600" />
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">In Planning</p>
              <p className="text-2xl font-bold text-blue-600">{summary.byStatus.planning}</p>
            </div>
            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
              <ClipboardList className="h-5 w-5 text-blue-600" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Main Pre-Op Cases Page
 */
export default function PreOpCasesPage() {
  const { user, isAuthenticated } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [readinessFilter, setReadinessFilter] = useState<'all' | 'ready' | 'pending'>('all');

  const {
    data,
    isLoading,
    error,
    refetch,
    isRefetching,
  } = usePreOpCases(
    readinessFilter === 'all' ? undefined : { readiness: readinessFilter }
  );

  // Filter cases by search query
  const filteredCases = useMemo(() => {
    if (!data?.cases) return [];
    if (!searchQuery.trim()) return data.cases;

    const query = searchQuery.toLowerCase();
    return data.cases.filter(
      (c) =>
        c.patient?.fullName?.toLowerCase().includes(query) ||
        c.patient?.fileNumber?.toLowerCase().includes(query) ||
        c.procedureName?.toLowerCase().includes(query) ||
        c.primarySurgeon?.name?.toLowerCase().includes(query)
    );
  }, [data?.cases, searchQuery]);

  if (!isAuthenticated || !user) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <p className="text-muted-foreground">Please log in to view pre-op cases</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Pre-Op Cases</h1>
          <p className="text-muted-foreground mt-1">
            Manage surgical cases pending pre-operative preparation
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isRefetching}
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${isRefetching ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Summary Stats */}
      {data?.summary && <SummaryStats summary={data.summary} />}

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by patient, file number, procedure, or surgeon..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select
              value={readinessFilter}
              onValueChange={(v) => setReadinessFilter(v as 'all' | 'ready' | 'pending')}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by readiness" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Cases</SelectItem>
                <SelectItem value="ready">Ready Only</SelectItem>
                <SelectItem value="pending">Pending Only</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Cases List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto" />
            <p className="mt-4 text-sm text-muted-foreground">Loading pre-op cases...</p>
          </div>
        </div>
      ) : error ? (
        <Card>
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h3 className="font-semibold text-lg mb-2">Failed to load cases</h3>
            <p className="text-muted-foreground mb-4">{(error as Error).message}</p>
            <Button onClick={() => refetch()}>Try Again</Button>
          </CardContent>
        </Card>
      ) : filteredCases.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-semibold text-lg mb-2">No cases found</h3>
            <p className="text-muted-foreground">
              {searchQuery
                ? 'Try adjusting your search criteria'
                : 'There are no surgical cases pending pre-op preparation'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredCases.map((surgicalCase) => (
            <PreOpCaseCard key={surgicalCase.id} surgicalCase={surgicalCase} />
          ))}
        </div>
      )}
    </div>
  );
}

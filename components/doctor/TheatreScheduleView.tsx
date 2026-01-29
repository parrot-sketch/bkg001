'use client';

/**
 * Theatre Schedule View
 * 
 * Surgeon-centric view showing:
 * - My cases today/this week
 * - Patient summary per case
 * - Procedure
 * - Duration
 * - Team assigned
 * - Readiness status (Cleared, Pending Labs, Awaiting Consent, Needs Review)
 * 
 * Surgeon should know instantly: "Am I ready to operate on this patient?"
 */

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  FileText,
  User,
  Calendar,
  ChevronDown,
  Activity
} from 'lucide-react';
import { format } from 'date-fns';
import { CaseReadinessStatus, getCaseReadinessStatusLabel } from '@/domain/enums/CaseReadinessStatus';
import Link from 'next/link';
import type { AppointmentResponseDto } from '@/application/dtos/AppointmentResponseDto';
import { cn } from '@/lib/utils';

interface CasePlan {
  id: number;
  appointment_id: number;
  procedure_plan?: string;
  readiness_status: CaseReadinessStatus;
  ready_for_surgery: boolean;
  risk_factors?: string;
  pre_op_notes?: string;
  consent_checklist?: string;
}

interface TheatreCase {
  appointment: AppointmentResponseDto;
  casePlan?: CasePlan;
  patientName: string;
  procedure?: string;
  duration?: string;
  teamAssigned?: string[];
}

interface TheatreScheduleViewProps {
  cases: TheatreCase[];
  loading?: boolean;
}

export function TheatreScheduleView({ cases, loading = false }: TheatreScheduleViewProps) {
  const getReadinessBadge = (status: CaseReadinessStatus | undefined, ready: boolean) => {
    if (ready && status === CaseReadinessStatus.READY) {
      return (
        <Badge className="bg-green-100 text-green-800 hover:bg-green-200">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Ready
        </Badge>
      );
    }

    if (!status || status === CaseReadinessStatus.NOT_STARTED) {
      return (
        <Badge variant="outline" className="text-gray-600">
          <Clock className="h-3 w-3 mr-1" />
          Not Started
        </Badge>
      );
    }

    const statusColors: Record<CaseReadinessStatus, string> = {
      [CaseReadinessStatus.PENDING_LABS]: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200',
      [CaseReadinessStatus.PENDING_CONSENT]: 'bg-orange-100 text-orange-800 hover:bg-orange-200',
      [CaseReadinessStatus.PENDING_REVIEW]: 'bg-blue-100 text-blue-800 hover:bg-blue-200',
      [CaseReadinessStatus.ON_HOLD]: 'bg-red-100 text-red-800 hover:bg-red-200',
      [CaseReadinessStatus.IN_PROGRESS]: 'bg-purple-100 text-purple-800 hover:bg-purple-200',
      [CaseReadinessStatus.READY]: 'bg-green-100 text-green-800 hover:bg-green-200',
      [CaseReadinessStatus.NOT_STARTED]: 'bg-gray-100 text-gray-800 hover:bg-gray-200',
    };

    const statusIcons: Record<CaseReadinessStatus, React.ReactNode> = {
      [CaseReadinessStatus.PENDING_LABS]: <AlertCircle className="h-3 w-3 mr-1" />,
      [CaseReadinessStatus.PENDING_CONSENT]: <FileText className="h-3 w-3 mr-1" />,
      [CaseReadinessStatus.PENDING_REVIEW]: <Clock className="h-3 w-3 mr-1" />,
      [CaseReadinessStatus.ON_HOLD]: <XCircle className="h-3 w-3 mr-1" />,
      [CaseReadinessStatus.IN_PROGRESS]: <Activity className="h-3 w-3 mr-1" />,
      [CaseReadinessStatus.READY]: <CheckCircle2 className="h-3 w-3 mr-1" />,
      [CaseReadinessStatus.NOT_STARTED]: <Clock className="h-3 w-3 mr-1" />,
    };

    return (
      <Badge className={statusColors[status]}>
        {statusIcons[status]}
        {getCaseReadinessStatusLabel(status)}
      </Badge>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Theatre Schedule</CardTitle>
          <CardDescription>Your surgical cases with readiness status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-sm text-muted-foreground">Loading schedule...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (cases.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Theatre Schedule</CardTitle>
          <CardDescription>Your surgical cases with readiness status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <div className="h-16 w-16 rounded-full bg-gray-50 flex items-center justify-center mx-auto mb-4">
              <Calendar className="h-8 w-8 text-gray-400" />
            </div>
            <p className="text-sm font-medium text-gray-600 mb-1">No cases scheduled</p>
            <p className="text-xs text-gray-500">Your theatre schedule is clear</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const readyCases = cases.filter(c => c.casePlan?.ready_for_surgery);
  const notReadyCases = cases.filter(c => !c.casePlan?.ready_for_surgery || !c.casePlan);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Theatre Schedule</CardTitle>
            <CardDescription>
              {cases.length} case{cases.length !== 1 ? 's' : ''} scheduled
              {readyCases.length > 0 && ` • ${readyCases.length} ready`}
              {notReadyCases.length > 0 && ` • ${notReadyCases.length} need attention`}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Ready Cases */}
          {readyCases.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-green-700 flex items-center">
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Ready for Surgery ({readyCases.length})
              </h3>
              {readyCases.map((theatreCase) => (
                <TheatreCaseCard
                  key={theatreCase.appointment.id}
                  theatreCase={theatreCase}
                  getReadinessBadge={getReadinessBadge}
                />
              ))}
            </div>
          )}

          {/* Not Ready Cases */}
          {notReadyCases.length > 0 && (
            <div className="space-y-3">
              {readyCases.length > 0 && (
                <h3 className="text-sm font-semibold text-orange-700 flex items-center mt-6">
                  <AlertCircle className="h-4 w-4 mr-2" />
                  Needs Attention ({notReadyCases.length})
                </h3>
              )}
              {notReadyCases.map((theatreCase) => (
                <TheatreCaseCard
                  key={theatreCase.appointment.id}
                  theatreCase={theatreCase}
                  getReadinessBadge={getReadinessBadge}
                />
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function TheatreCaseCard({
  theatreCase,
  getReadinessBadge,
}: {
  theatreCase: TheatreCase;
  getReadinessBadge: (status: CaseReadinessStatus | undefined, ready: boolean) => React.ReactNode;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { appointment, casePlan, patientName, procedure, duration, teamAssigned } = theatreCase;

  return (
    <div className="border border-slate-200 rounded-2xl bg-white overflow-hidden transition-all duration-300 hover:border-slate-400 hover:shadow-lg hover:shadow-slate-100">
      <div className="p-5">
        <div className="flex items-start justify-between gap-4">
          {/* Main Info Area */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-3 mb-2.5">
              <h4 className="font-extrabold text-slate-900 text-lg tracking-tight truncate">{patientName}</h4>
              <div className="scale-95 origin-left">
                {getReadinessBadge(casePlan?.readiness_status, casePlan?.ready_for_surgery ?? false)}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-slate-500 font-medium">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-indigo-500/70" />
                <span className="text-slate-900 font-bold">{appointment.time}</span>
              </div>
              {procedure && (
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-emerald-500/70" />
                  <span className="truncate text-slate-700 font-semibold">{procedure}</span>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 flex-shrink-0 pt-1">
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "h-10 w-10 rounded-xl transition-all hover:bg-slate-100",
                isExpanded && "bg-slate-100 rotate-180"
              )}
              onClick={() => setIsExpanded(!isExpanded)}
              title="View Case Logistics"
            >
              <ChevronDown className="h-5 w-5 text-slate-400" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-10 px-4 text-xs font-black uppercase tracking-wider border-slate-200 shadow-sm hover:bg-slate-50 rounded-xl"
              asChild
            >
              <Link href={`/doctor/cases/${appointment.id}`}>
                Review
              </Link>
            </Button>
          </div>
        </div>

        {/* Expandable Details Area */}
        {isExpanded && (
          <div className="mt-5 pt-5 border-t border-slate-100 space-y-5 animate-in fade-in slide-in-from-top-4 duration-300">
            {/* Clinical Metadata */}
            <div className="grid grid-cols-2 gap-6 bg-slate-50/50 p-4 rounded-xl">
              <div className="space-y-1.5 text-center sm:text-left">
                <span className="text-[10px] uppercase tracking-widest font-black text-slate-400">Est. Duration</span>
                <p className="text-sm font-bold text-slate-900">{duration || '60-90 min'}</p>
              </div>
              <div className="space-y-1.5 text-center sm:text-left">
                <span className="text-[10px] uppercase tracking-widest font-black text-slate-400">Clinical Team</span>
                <p className="text-sm font-bold text-slate-900 truncate">{teamAssigned?.join(', ') || 'Lead Surgeon + Scrub Nurse'}</p>
              </div>
            </div>

            {/* Technical Plans */}
            {casePlan?.procedure_plan && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
                  <span className="text-[10px] uppercase tracking-widest font-black text-slate-400">Surgical Strategy</span>
                </div>
                <p className="text-xs leading-relaxed text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100 italic">
                  {casePlan.procedure_plan}
                </p>
              </div>
            )}

            {/* Risk Management */}
            {casePlan?.risk_factors && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                  <span className="text-[10px] uppercase tracking-widest font-black text-amber-600">Risk Factors</span>
                </div>
                <div className="p-3 bg-amber-50/30 rounded-xl border border-amber-100/50">
                  <p className="text-xs leading-relaxed text-amber-900 font-medium">
                    {casePlan.risk_factors}
                  </p>
                </div>
              </div>
            )}

            <div className="flex justify-end">
              <Button
                variant="link"
                className="h-auto p-0 text-xs font-black text-indigo-600 hover:text-indigo-700 decoration-indigo-200"
                asChild
              >
                <Link href={`/doctor/operative/plan/${appointment.id}/new`}>
                  {casePlan?.ready_for_surgery ? "MODIFY CLINICAL PLAN" : "COMPLETE CASE PLANNING"} →
                </Link>
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

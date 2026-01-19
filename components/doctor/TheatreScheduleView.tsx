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

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Clock, AlertCircle, XCircle, FileText, User, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { CaseReadinessStatus, getCaseReadinessStatusLabel } from '@/domain/enums/CaseReadinessStatus';
import Link from 'next/link';
import type { AppointmentResponseDto } from '@/application/dtos/AppointmentResponseDto';

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
      [CaseReadinessStatus.READY]: 'bg-green-100 text-green-800 hover:bg-green-200',
      [CaseReadinessStatus.NOT_STARTED]: 'bg-gray-100 text-gray-800 hover:bg-gray-200',
    };

    const statusIcons: Record<CaseReadinessStatus, React.ReactNode> = {
      [CaseReadinessStatus.PENDING_LABS]: <AlertCircle className="h-3 w-3 mr-1" />,
      [CaseReadinessStatus.PENDING_CONSENT]: <FileText className="h-3 w-3 mr-1" />,
      [CaseReadinessStatus.PENDING_REVIEW]: <Clock className="h-3 w-3 mr-1" />,
      [CaseReadinessStatus.ON_HOLD]: <XCircle className="h-3 w-3 mr-1" />,
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
  const { appointment, casePlan, patientName, procedure, duration, teamAssigned } = theatreCase;

  return (
    <div className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h4 className="font-semibold text-lg">{patientName}</h4>
            {getReadinessBadge(casePlan?.readiness_status, casePlan?.ready_for_surgery ?? false)}
          </div>

          <div className="space-y-2 text-sm text-gray-600">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4 text-gray-400" />
                <span>
                  {format(new Date(appointment.appointmentDate), 'MMM d, yyyy')} at {appointment.time}
                </span>
              </div>
              {procedure && (
                <div className="flex items-center gap-1.5">
                  <FileText className="h-4 w-4 text-gray-400" />
                  <span className="font-medium">{procedure}</span>
                </div>
              )}
              {duration && (
                <div className="flex items-center gap-1.5">
                  <Clock className="h-4 w-4 text-gray-400" />
                  <span>{duration}</span>
                </div>
              )}
            </div>

            {teamAssigned && teamAssigned.length > 0 && (
              <div className="flex items-center gap-1.5">
                <User className="h-4 w-4 text-gray-400" />
                <span>Team: {teamAssigned.join(', ')}</span>
              </div>
            )}

            {casePlan?.procedure_plan && (
              <div className="mt-2 p-2 bg-blue-50 rounded text-xs">
                <span className="font-medium">Plan:</span> {casePlan.procedure_plan.substring(0, 150)}
                {casePlan.procedure_plan.length > 150 && '...'}
              </div>
            )}

            {casePlan?.risk_factors && (
              <div className="mt-2 text-xs text-orange-700">
                <span className="font-medium">Risk Factors:</span> {casePlan.risk_factors}
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-2 ml-4">
          <Button
            variant="outline"
            size="sm"
            asChild
          >
            <Link href={`/doctor/cases/${appointment.id}`}>
              View Case
            </Link>
          </Button>
          {!casePlan?.ready_for_surgery && (
            <Button
              variant="default"
              size="sm"
              asChild
            >
              <Link href={`/doctor/cases/${appointment.id}/plan`}>
                Plan Case
              </Link>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

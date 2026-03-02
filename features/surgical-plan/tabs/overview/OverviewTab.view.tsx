/**
 * Overview Tab View
 * 
 * Presentational component for overview tab.
 * Displays basic case metadata.
 */

'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, Calendar, User, Stethoscope } from 'lucide-react';
import type { SurgicalCasePlanViewModel } from '../../core/types';
import { READINESS_CONFIG, STATUS_CONFIG } from '../../core/constants';
import { format, parseISO } from 'date-fns';

interface OverviewTabViewProps {
  data: SurgicalCasePlanViewModel;
}

export function OverviewTabView({ data }: OverviewTabViewProps) {
  const readinessConfig =
    READINESS_CONFIG[data.casePlan?.readinessStatus ?? 'NOT_STARTED'] ??
    READINESS_CONFIG.NOT_STARTED;
  const statusConfig = STATUS_CONFIG[data.case.status] ?? STATUS_CONFIG.DRAFT;

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold mb-4">Case Overview</h3>
      </div>

      {/* Patient Info */}
      {data.patient && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <User className="h-4 w-4" />
              Patient Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div>
              <p className="text-sm font-medium">{data.patient.fullName}</p>
              {data.patient.fileNumber && (
                <p className="text-xs text-muted-foreground font-mono">
                  {data.patient.fileNumber}
                </p>
              )}
            </div>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              {data.patient.gender && <span>{data.patient.gender}</span>}
              {data.patient.age && <span>{data.patient.age}</span>}
            </div>
            {data.patient.allergies && (
              <Badge variant="destructive" className="text-xs">
                Allergy: {data.patient.allergies}
              </Badge>
            )}
          </CardContent>
        </Card>
      )}

      {/* Case Details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Stethoscope className="h-4 w-4" />
            Case Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant={readinessConfig.variant} className="text-xs">
              {readinessConfig.label}
            </Badge>
            <Badge variant="outline" className={`text-xs ${statusConfig.className}`}>
              {statusConfig.label}
            </Badge>
          </div>
          {data.case.procedureName && (
            <div>
              <p className="text-xs text-muted-foreground">Procedure</p>
              <p className="text-sm font-medium">{data.case.procedureName}</p>
            </div>
          )}
          {data.casePlan?.estimatedDurationMinutes && (
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-3.5 w-3.5 text-muted-foreground" />
              <span>{data.casePlan.estimatedDurationMinutes} minutes</span>
            </div>
          )}
          {data.theaterBooking && (
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
              <span>
                {format(parseISO(data.theaterBooking.startTime), 'MMM d, yyyy • HH:mm')}
              </span>
              {data.theaterBooking.theaterName && (
                <span className="text-muted-foreground">
                  — {data.theaterBooking.theaterName}
                </span>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Readiness Checklist Summary */}
      {data.readinessChecklist.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Readiness Checklist</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.readinessChecklist.map((item) => (
                <div
                  key={item.key}
                  className="flex items-center justify-between text-sm"
                >
                  <span className={item.done ? 'text-foreground' : 'text-muted-foreground'}>
                    {item.label}
                  </span>
                  <Badge variant={item.done ? 'default' : 'outline'} className="text-xs">
                    {item.done ? 'Complete' : 'Pending'}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

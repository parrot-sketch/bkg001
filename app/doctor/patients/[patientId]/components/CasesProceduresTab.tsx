'use client';

import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, Stethoscope, CheckCircle2, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { CaseReadinessStatus, getCaseReadinessStatusLabel } from '@/domain/enums/CaseReadinessStatus';

interface CasesProceduresTabProps {
  patientId: string;
  casePlans: any[];
  loading: boolean;
}

export function CasesProceduresTab({
  patientId,
  casePlans,
  loading,
}: CasesProceduresTabProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Cases & Procedures</CardTitle>
            <CardDescription>Surgical cases and procedure plans</CardDescription>
          </div>
          <Link href={`/doctor/patients/${patientId}/case-plans`}>
            <Button variant="outline" size="sm">
              <Eye className="h-4 w-4 mr-2" />
              View All
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-sm text-muted-foreground">Loading case plans...</p>
          </div>
        ) : casePlans.length === 0 ? (
          <div className="text-center py-8">
            <Stethoscope className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-sm text-muted-foreground mb-4">No case plans found</p>
            <p className="text-xs text-muted-foreground mb-4">
              Case plans are created when a consultation results in a procedure recommendation.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {casePlans.slice(0, 5).map((casePlan) => (
              <div
                key={casePlan.id}
                className="rounded-lg border border-border p-4 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    {casePlan.appointment && (
                      <div className="flex items-center gap-2 mb-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="font-semibold">
                          {format(new Date(casePlan.appointment.appointmentDate), 'MMM dd, yyyy')}
                        </span>
                        <Clock className="h-4 w-4 text-muted-foreground ml-2" />
                        <span className="text-sm text-muted-foreground">
                          {casePlan.appointment.time}
                        </span>
                      </div>
                    )}
                    {casePlan.procedurePlan && (
                      <div
                        className="text-sm text-foreground line-clamp-3 mb-2 prose prose-sm max-w-none prose-p:my-0.5 prose-ul:my-0.5 prose-li:my-0"
                        dangerouslySetInnerHTML={{ __html: casePlan.procedurePlan }}
                      />
                    )}
                    {casePlan.doctor && (
                      <p className="text-xs text-muted-foreground">
                        {casePlan.doctor.name} • {casePlan.doctor.specialization}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <Badge
                      variant={
                        casePlan.readinessStatus === CaseReadinessStatus.READY
                          ? 'default'
                          : casePlan.readinessStatus === CaseReadinessStatus.PENDING_LABS ||
                              casePlan.readinessStatus === CaseReadinessStatus.PENDING_CONSENT ||
                              casePlan.readinessStatus === CaseReadinessStatus.PENDING_REVIEW
                            ? 'secondary'
                            : casePlan.readinessStatus === CaseReadinessStatus.ON_HOLD
                              ? 'destructive'
                              : 'outline'
                      }
                    >
                      {getCaseReadinessStatusLabel(casePlan.readinessStatus)}
                    </Badge>
                    {casePlan.readyForSurgery && (
                      <Badge variant="default" className="bg-green-500">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Ready
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between pt-3 border-t">
                  <div className="text-xs text-muted-foreground">
                    Updated: {format(new Date(casePlan.updatedAt), 'MMM dd, yyyy')}
                  </div>
                  <div className="flex items-center gap-2">
                    <Link href={`/doctor/patients/${patientId}/case-plans`}>
                      <Button variant="outline" size="sm">
                        <Eye className="h-4 w-4 mr-1" />
                        View Details
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            ))}
            {casePlans.length > 5 && (
              <div className="text-center pt-4">
                <Link href={`/doctor/patients/${patientId}/case-plans`}>
                  <Button variant="outline" size="sm">
                    View All {casePlans.length} Case Plans
                  </Button>
                </Link>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

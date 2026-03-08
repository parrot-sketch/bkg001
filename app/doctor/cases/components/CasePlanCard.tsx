'use client';

import { format } from 'date-fns';
import { 
  Calendar, 
  Clock, 
  User, 
  Stethoscope, 
  AlertCircle, 
  FileText, 
  CheckCircle2, 
  Eye, 
  Edit 
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CaseReadinessStatus, getCaseReadinessStatusLabel } from '@/domain/enums/CaseReadinessStatus';
import { useRouter } from 'next/navigation';

interface CasePlanCardProps {
  casePlan: any;
}

export function CasePlanCard({ casePlan }: CasePlanCardProps) {
  const router = useRouter();

  const getReadinessStatusVariant = (status: CaseReadinessStatus): 'default' | 'secondary' | 'destructive' | 'outline' => {
    switch (status) {
      case CaseReadinessStatus.READY:
        return 'default';
      case CaseReadinessStatus.PENDING_LABS:
      case CaseReadinessStatus.PENDING_CONSENT:
      case CaseReadinessStatus.PENDING_REVIEW:
        return 'secondary';
      case CaseReadinessStatus.ON_HOLD:
        return 'destructive';
      default:
        return 'outline';
    }
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              {casePlan.appointment && (
                <div>
                  <CardTitle className="text-lg">
                    {format(new Date(casePlan.appointment.appointmentDate), 'EEEE, MMMM dd, yyyy')}
                  </CardTitle>
                  <CardDescription className="mt-1 flex items-center gap-2">
                    <Clock className="h-3 w-3" />
                    {casePlan.appointment.time} • {casePlan.appointment.type}
                  </CardDescription>
                </div>
              )}
            </div>
            {casePlan.doctor && (
              <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                <User className="h-4 w-4" />
                {casePlan.doctor.name} • {casePlan.doctor.specialization}
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Badge variant={getReadinessStatusVariant(casePlan.readinessStatus)}>
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
      </CardHeader>
      <CardContent className="space-y-4">
        {casePlan.procedurePlan && (
          <div>
            <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
              <Stethoscope className="h-4 w-4" />
              Procedure Plan
            </h4>
            <p className="text-sm text-foreground whitespace-pre-wrap">{casePlan.procedurePlan}</p>
          </div>
        )}

        {casePlan.riskFactors && (
          <div>
            <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-amber-500" />
              Risk Factors
            </h4>
            <p className="text-sm text-foreground whitespace-pre-wrap">{casePlan.riskFactors}</p>
          </div>
        )}

        {casePlan.preOpNotes && (
          <div>
            <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Pre-Operative Notes
            </h4>
            <p className="text-sm text-foreground whitespace-pre-wrap">{casePlan.preOpNotes}</p>
          </div>
        )}

        {casePlan.implantDetails && (
          <div>
            <h4 className="text-sm font-semibold mb-2">Implant Details</h4>
            <p className="text-sm text-foreground whitespace-pre-wrap">{casePlan.implantDetails}</p>
          </div>
        )}

        {casePlan.plannedAnesthesia && (
          <div>
            <h4 className="text-sm font-semibold mb-2">Planned Anesthesia</h4>
            <p className="text-sm text-foreground">{casePlan.plannedAnesthesia}</p>
          </div>
        )}

        {casePlan.specialInstructions && (
          <div>
            <h4 className="text-sm font-semibold mb-2">Special Instructions</h4>
            <p className="text-sm text-foreground whitespace-pre-wrap">{casePlan.specialInstructions}</p>
          </div>
        )}

        <div className="flex items-center justify-between pt-4 border-t">
          <div className="text-xs text-muted-foreground">
            Created: {format(new Date(casePlan.createdAt), 'MMM dd, yyyy')} • 
            Updated: {format(new Date(casePlan.updatedAt), 'MMM dd, yyyy')}
          </div>
          <div className="flex items-center gap-2">
            {casePlan.appointment && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push(`/doctor/appointments`)}
              >
                <Eye className="h-4 w-4 mr-1" />
                View Appointment
              </Button>
            )}
            <Button variant="outline" size="sm" disabled>
              <Edit className="h-4 w-4 mr-1" />
              Edit Plan
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

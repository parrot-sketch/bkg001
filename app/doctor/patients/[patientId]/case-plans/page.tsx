'use client';

/**
 * Doctor Patient Case Plans Page
 * 
 * View and manage surgical case plans for a specific patient.
 * Displays all case plans with their readiness status and details.
 */

import { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/patient/useAuth';
import { doctorApi } from '@/lib/api/doctor';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft, 
  Calendar, 
  Clock, 
  FileText, 
  AlertCircle,
  CheckCircle2,
  User,
  Stethoscope,
  ClipboardCheck,
  Activity,
  Eye,
  Edit
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { CaseReadinessStatus, getCaseReadinessStatusLabel } from '@/domain/enums/CaseReadinessStatus';
import { apiClient } from '@/lib/api/client';

interface CasePlanResponseDto {
  id: number;
  appointmentId: number;
  patientId: string;
  doctorId: string;
  procedurePlan?: string;
  riskFactors?: string;
  preOpNotes?: string;
  implantDetails?: string;
  markingDiagram?: string;
  consentChecklist?: string;
  plannedAnesthesia?: string;
  specialInstructions?: string;
  readinessStatus: CaseReadinessStatus;
  readyForSurgery: boolean;
  createdAt: Date;
  updatedAt: Date;
  appointment?: {
    id: number;
    appointmentDate: Date;
    time: string;
    type: string;
    status: string;
  };
  doctor?: {
    id: string;
    name: string;
    specialization: string;
  };
}

export default function DoctorPatientCasePlansPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const patientId = params.patientId as string;

  // Get navigation context from query params
  const fromConsultation = searchParams.get('from') === 'consultation';
  const consultationAppointmentId = searchParams.get('appointmentId');

  const [casePlans, setCasePlans] = useState<CasePlanResponseDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [patientName, setPatientName] = useState<string>('');

  useEffect(() => {
    // Wait for auth to finish loading before checking
    if (authLoading) {
      return;
    }

    if (!isAuthenticated || !user) {
      router.push('/login');
      return;
    }

    if (!patientId) {
      toast.error('Invalid patient ID');
      router.push('/doctor/patients');
      return;
    }

    loadData();
  }, [isAuthenticated, user, patientId, authLoading, router]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Load patient details for name
      const patientResponse = await doctorApi.getPatient(patientId);
      if (patientResponse.success && patientResponse.data) {
        setPatientName(`${patientResponse.data.firstName} ${patientResponse.data.lastName}`);
      }

      // Load case plans
      const response = await apiClient.get<CasePlanResponseDto[]>(`/patients/${patientId}/case-plans`);
      if (response.success && response.data) {
        setCasePlans(response.data);
      } else {
        toast.error('Failed to load case plans');
      }
    } catch (error) {
      console.error('Error loading case plans:', error);
      toast.error('An error occurred while loading case plans');
    } finally {
      setLoading(false);
    }
  };

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

  // Show loading while auth is checking or data is loading
  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-sm text-muted-foreground">
            {authLoading ? 'Checking authentication...' : 'Loading case plans...'}
          </p>
        </div>
      </div>
    );
  }

  // If not authenticated after loading, show message (redirect will happen in useEffect)
  if (!isAuthenticated || !user) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-muted-foreground">Please log in to view case plans</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            {fromConsultation && consultationAppointmentId ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push(`/doctor/consultations/${consultationAppointmentId}/session`)}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Consultation
              </Button>
            ) : null}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push(`/doctor/patients/${patientId}`)}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Profile
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/doctor/patients')}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Patients
            </Button>
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Case Plans</h1>
            <p className="text-muted-foreground mt-1">
              {patientName ? `Surgical case plans for ${patientName}` : 'View and manage surgical case plans'}
            </p>
          </div>
        </div>
      </div>

      {/* Case Plans List */}
      {casePlans.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <Stethoscope className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Case Plans Found</h3>
              <p className="text-sm text-muted-foreground mb-4">
                This patient doesn't have any surgical case plans yet.
              </p>
              <p className="text-xs text-muted-foreground">
                Case plans are created when a consultation results in a procedure recommendation.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {casePlans.map((casePlan) => (
            <Card key={casePlan.id} className="hover:shadow-md transition-shadow">
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
          ))}
        </div>
      )}
    </div>
  );
}

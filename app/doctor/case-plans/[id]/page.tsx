'use client';

/**
 * Doctor Case Plan Detail Page
 * 
 * Displays a single case plan with all its details.
 * Linked from the Treatment Plan tab in the consultation workspace.
 * Provides navigation to the full operative planning workspace.
 */

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/patient/useAuth';
import { apiClient } from '@/lib/api/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  Shield,
  Edit,
  Loader2,
  Syringe,
  ClipboardList,
  MessageSquare,
  Camera,
  ExternalLink,
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { CaseReadinessStatus, getCaseReadinessStatusLabel } from '@/domain/enums/CaseReadinessStatus';

interface CasePlanDetail {
  id: number;
  appointmentId: number;
  patientId: string;
  doctorId: string;
  procedurePlan: string | null;
  riskFactors: string | null;
  preOpNotes: string | null;
  implantDetails: string | null;
  markingDiagram: string | null;
  consentChecklist: string | null;
  plannedAnesthesia: string | null;
  specialInstructions: string | null;
  readinessStatus: CaseReadinessStatus;
  readyForSurgery: boolean;
  createdAt: string;
  updatedAt: string;
  appointment?: {
    id: number;
    appointmentDate: string;
    time: string;
    type: string;
    status: string;
  };
  patient?: {
    id: string;
    firstName: string;
    lastName: string;
    gender: string;
    dateOfBirth: string;
    fileNumber: string;
    allergies: string | null;
  };
  doctor?: {
    id: string;
    name: string;
    specialization: string;
  };
  consents?: Array<{
    id: string;
    title: string;
    type: string;
    status: string;
    createdAt: string;
  }>;
  images?: Array<{
    id: number;
    imageUrl: string;
    timepoint: string;
    description: string;
  }>;
  procedureRecord?: {
    urgency: string;
    anesthesiaType: string;
    staff: Array<{
      role: string;
      user?: {
        firstName: string;
        lastName: string;
        role: string;
      };
    }>;
  };
}

export default function CasePlanDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const casePlanId = params.id as string;

  const [casePlan, setCasePlan] = useState<CasePlanDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;

    if (!isAuthenticated || !user) {
      router.push('/login');
      return;
    }

    if (!casePlanId) {
      toast.error('Invalid case plan ID');
      router.push('/doctor/dashboard');
      return;
    }

    loadCasePlan();
  }, [isAuthenticated, user, casePlanId, authLoading, router]);

  const loadCasePlan = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.get<CasePlanDetail>(`/case-plans/${casePlanId}`);
      if (response.success && response.data) {
        setCasePlan(response.data);
      } else {
        setError(!response.success ? response.error : 'Failed to load case plan');
      }
    } catch (err) {
      console.error('Error loading case plan:', err);
      setError('An error occurred while loading the case plan');
    } finally {
      setLoading(false);
    }
  };

  const getReadinessVariant = (status: CaseReadinessStatus): 'default' | 'secondary' | 'destructive' | 'outline' => {
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

  // Loading state
  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="mt-4 text-sm text-muted-foreground">
            {authLoading ? 'Checking authentication...' : 'Loading case plan...'}
          </p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !casePlan) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Go Back
        </Button>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Case Plan Not Found</h3>
              <p className="text-sm text-muted-foreground">
                {error || 'The case plan you are looking for does not exist.'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const patientName = casePlan.patient
    ? `${casePlan.patient.firstName} ${casePlan.patient.lastName}`
    : 'Unknown Patient';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Case Plan #{casePlan.id}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {patientName} &middot; {casePlan.doctor?.specialization || 'General'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant={getReadinessVariant(casePlan.readinessStatus)}>
            {getCaseReadinessStatusLabel(casePlan.readinessStatus)}
          </Badge>
          {casePlan.readyForSurgery && (
            <Badge variant="default" className="bg-green-500">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Ready for Surgery
            </Badge>
          )}
          <Button asChild>
            <Link href={`/doctor/operative/plan/${casePlan.appointmentId}/new`}>
              <Edit className="h-4 w-4 mr-2" />
              Edit Plan
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Procedure Plan */}
          {casePlan.procedurePlan && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Stethoscope className="h-4 w-4 text-primary" />
                  Procedure Plan
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div
                  className="prose prose-sm max-w-none text-foreground"
                  dangerouslySetInnerHTML={{ __html: casePlan.procedurePlan }}
                />
              </CardContent>
            </Card>
          )}

          {/* Risk Factors */}
          {casePlan.riskFactors && (
            <Card className="border-amber-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-amber-500" />
                  Risk Factors
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div
                  className="prose prose-sm max-w-none text-foreground"
                  dangerouslySetInnerHTML={{ __html: casePlan.riskFactors }}
                />
              </CardContent>
            </Card>
          )}

          {/* Pre-Operative Notes */}
          {casePlan.preOpNotes && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  Pre-Operative Notes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div
                  className="prose prose-sm max-w-none text-foreground"
                  dangerouslySetInnerHTML={{ __html: casePlan.preOpNotes }}
                />
              </CardContent>
            </Card>
          )}

          {/* Implant Details */}
          {casePlan.implantDetails && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <ClipboardList className="h-4 w-4 text-muted-foreground" />
                  Implant Details
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div
                  className="prose prose-sm max-w-none text-foreground"
                  dangerouslySetInnerHTML={{ __html: casePlan.implantDetails }}
                />
              </CardContent>
            </Card>
          )}

          {/* Special Instructions */}
          {casePlan.specialInstructions && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                  Special Instructions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div
                  className="prose prose-sm max-w-none text-foreground"
                  dangerouslySetInnerHTML={{ __html: casePlan.specialInstructions }}
                />
              </CardContent>
            </Card>
          )}

          {/* Images */}
          {casePlan.images && casePlan.images.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Camera className="h-4 w-4 text-muted-foreground" />
                  Pre-Operative Images ({casePlan.images.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {casePlan.images.map((img) => (
                    <div key={img.id} className="relative aspect-square rounded-lg overflow-hidden border">
                      <img
                        src={img.imageUrl}
                        alt={img.description || 'Pre-op image'}
                        className="object-cover w-full h-full"
                      />
                      {img.description && (
                        <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs p-2">
                          {img.description}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Empty state if no plan details */}
          {!casePlan.procedurePlan &&
           !casePlan.riskFactors &&
           !casePlan.preOpNotes &&
           !casePlan.implantDetails &&
           !casePlan.specialInstructions && (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-12">
                  <Stethoscope className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Plan Details Yet</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    This case plan has been created but no details have been filled in yet.
                  </p>
                  <Button asChild>
                    <Link href={`/doctor/operative/plan/${casePlan.appointmentId}/new`}>
                      <Edit className="h-4 w-4 mr-2" />
                      Start Planning
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Patient Info */}
          {casePlan.patient && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Patient
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="font-semibold text-lg">{patientName}</p>
                  {casePlan.patient.fileNumber && (
                    <p className="text-sm text-muted-foreground">
                      File: {casePlan.patient.fileNumber}
                    </p>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-muted-foreground">Gender</span>
                    <p className="font-medium">{casePlan.patient.gender || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">DOB</span>
                    <p className="font-medium">
                      {casePlan.patient.dateOfBirth
                        ? format(new Date(casePlan.patient.dateOfBirth), 'MMM dd, yyyy')
                        : 'N/A'}
                    </p>
                  </div>
                </div>
                {casePlan.patient.allergies && (
                  <div className="bg-destructive/10 border border-destructive/20 p-3 rounded-lg">
                    <div className="flex items-center gap-2 text-sm text-destructive font-medium">
                      <AlertCircle className="h-4 w-4" />
                      Allergies: {casePlan.patient.allergies}
                    </div>
                  </div>
                )}
                <Button variant="outline" size="sm" className="w-full" asChild>
                  <Link href={`/doctor/patients/${casePlan.patient.id}`}>
                    <ExternalLink className="h-3.5 w-3.5 mr-2" />
                    View Patient Profile
                  </Link>
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Appointment Info */}
          {casePlan.appointment && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Appointment
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>{format(new Date(casePlan.appointment.appointmentDate), 'EEEE, MMMM dd, yyyy')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>{casePlan.appointment.time}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Type</span>
                  <Badge variant="outline">{casePlan.appointment.type}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <Badge variant="secondary">{casePlan.appointment.status}</Badge>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Anesthesia */}
          {casePlan.plannedAnesthesia && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Syringe className="h-4 w-4" />
                  Anesthesia
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">{casePlan.plannedAnesthesia}</p>
              </CardContent>
            </Card>
          )}

          {/* Safety Checklist */}
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" />
                Safety & Readiness
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <CheckItem label="Procedure Defined" checked={!!casePlan.procedurePlan} />
              <CheckItem label="Risk Factors Assessed" checked={!!casePlan.riskFactors} />
              <CheckItem label="Anesthesia Planned" checked={!!casePlan.plannedAnesthesia} />
              <CheckItem
                label="Consents Signed"
                checked={casePlan.consents ? casePlan.consents.some((c) => c.status === 'SIGNED') : false}
              />
              <CheckItem label="Pre-Op Images" checked={(casePlan.images?.length ?? 0) > 0} />
            </CardContent>
          </Card>

          {/* Consents Summary */}
          {casePlan.consents && casePlan.consents.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Consents ({casePlan.consents.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {casePlan.consents.map((consent) => (
                  <div key={consent.id} className="flex items-center justify-between text-sm">
                    <span>{consent.title}</span>
                    <Badge variant={consent.status === 'SIGNED' ? 'default' : 'secondary'} className="text-xs">
                      {consent.status}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Timestamps */}
          <div className="text-xs text-muted-foreground space-y-1 px-1">
            <p>Created: {format(new Date(casePlan.createdAt), 'MMM dd, yyyy h:mm a')}</p>
            <p>Updated: {format(new Date(casePlan.updatedAt), 'MMM dd, yyyy h:mm a')}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function CheckItem({ label, checked }: { label: string; checked: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className={`text-sm ${checked ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
        {label}
      </span>
      {checked ? (
        <CheckCircle2 className="h-4 w-4 text-green-500" />
      ) : (
        <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/30" />
      )}
    </div>
  );
}

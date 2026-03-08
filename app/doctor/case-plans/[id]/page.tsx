'use client';

/**
 * Doctor Case Plan Detail Page - REFACTORED
 * 
 * Displays a single case plan with all its details.
 * Modularized for better maintainability and cleaner code.
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
  User,
  Stethoscope,
  Loader2,
  Syringe,
  ClipboardList,
  MessageSquare,
  Camera,
  ExternalLink,
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { CaseReadinessStatus } from '@/domain/enums/CaseReadinessStatus';

// Modular Components
import { CasePlanDetailHeader } from '../components/CasePlanDetailHeader';
import { CasePlanContentSection } from '../components/CasePlanContentSection';
import { CasePlanSafetyChecklist } from '../components/CasePlanSafetyChecklist';

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
    status: string;
  }>;
  images?: Array<{
    id: number;
    imageUrl: string;
    description: string;
  }>;
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
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      
      <CasePlanDetailHeader 
        id={casePlan.id}
        appointmentId={casePlan.appointmentId}
        patientName={patientName}
        specialization={casePlan.doctor?.specialization || 'General'}
        readinessStatus={casePlan.readinessStatus}
        readyForSurgery={casePlan.readyForSurgery}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          <CasePlanContentSection 
            title="Procedure Plan"
            icon={Stethoscope}
            content={casePlan.procedurePlan}
            iconClassName="text-primary"
          />

          <CasePlanContentSection 
            title="Risk Factors"
            icon={AlertCircle}
            content={casePlan.riskFactors}
            className="border-amber-200"
            iconClassName="text-amber-500"
          />

          <CasePlanContentSection 
            title="Pre-Operative Notes"
            icon={FileText}
            content={casePlan.preOpNotes}
            iconClassName="text-muted-foreground"
          />

          <CasePlanContentSection 
            title="Implant Details"
            icon={ClipboardList}
            content={casePlan.implantDetails}
            iconClassName="text-muted-foreground"
          />

          <CasePlanContentSection 
            title="Special Instructions"
            icon={MessageSquare}
            content={casePlan.specialInstructions}
            iconClassName="text-muted-foreground"
          />

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
                    <div key={img.id} className="relative aspect-square rounded-lg overflow-hidden border bg-slate-50">
                      <img
                        src={img.imageUrl}
                        alt={img.description || 'Pre-op image'}
                        className="object-cover w-full h-full hover:scale-105 transition-transform duration-300"
                      />
                      {img.description && (
                        <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[10px] p-1.5 backdrop-blur-sm">
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
                  <p className="text-sm text-muted-foreground mb-6">
                    This case plan has been created but no details have been filled in yet.
                  </p>
                  <Button asChild className="px-8">
                    <Link href={`/doctor/operative/plan/${casePlan.appointmentId}/new`}>
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
          {/* Patient Info Card */}
          {casePlan.patient && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Patient Info
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="font-semibold text-lg">{patientName}</p>
                  <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-0.5">
                    File: <span className="font-medium text-foreground">{casePlan.patient.fileNumber || 'N/A'}</span>
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div className="space-y-0.5">
                    <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Gender</p>
                    <p className="text-sm font-medium">{casePlan.patient.gender || 'N/A'}</p>
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">DOB</p>
                    <p className="text-sm font-medium">
                      {casePlan.patient.dateOfBirth
                        ? format(new Date(casePlan.patient.dateOfBirth), 'MMM dd, yyyy')
                        : 'N/A'}
                    </p>
                  </div>
                </div>
                {casePlan.patient.allergies && (
                  <div className="bg-destructive/5 border border-destructive/10 p-2.5 rounded-lg flex items-start gap-2 mt-2">
                    <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                    <p className="text-xs text-destructive font-medium leading-tight">
                      Allergies: {casePlan.patient.allergies}
                    </p>
                  </div>
                )}
                <Button variant="outline" size="sm" className="w-full mt-2" asChild>
                  <Link href={`/doctor/patients/${casePlan.patient.id}`}>
                    <ExternalLink className="h-3.5 w-3.5 mr-2" />
                    View Profile
                  </Link>
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Appointment Summary Card */}
          {casePlan.appointment && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Appointment
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2.5 text-sm">
                <div className="flex items-center gap-2 text-slate-600">
                  <Calendar className="h-4 w-4" />
                  <span>{format(new Date(casePlan.appointment.appointmentDate), 'EEEE, MMM dd')}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-600">
                  <Clock className="h-4 w-4" />
                  <span>{casePlan.appointment.time}</span>
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                  <span className="text-muted-foreground text-xs uppercase font-bold tracking-tight">Type</span>
                  <Badge variant="outline" className="text-[10px] h-5">{casePlan.appointment.type}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground text-xs uppercase font-bold tracking-tight">Status</span>
                  <Badge variant="secondary" className="text-[10px] h-5">{casePlan.appointment.status}</Badge>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Anesthesia Short Info */}
          {casePlan.plannedAnesthesia && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Syringe className="h-4 w-4" />
                  Anesthesia
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm font-medium text-slate-700">{casePlan.plannedAnesthesia}</p>
              </CardContent>
            </Card>
          )}

          {/* Safety Checklist Sidebar */}
          <CasePlanSafetyChecklist 
            hasProcedure={!!casePlan.procedurePlan}
            hasRisks={!!casePlan.riskFactors}
            hasAnesthesia={!!casePlan.plannedAnesthesia}
            hasConsents={casePlan.consents ? casePlan.consents.some((c) => c.status === 'SIGNED') : false}
            hasImages={(casePlan.images?.length ?? 0) > 0}
          />

          {/* Timestamps */}
          <div className="text-[10px] text-muted-foreground space-y-1 px-1 pt-2 border-t border-slate-100">
            <p>Created: {format(new Date(casePlan.createdAt), 'MMM dd, yyyy h:mm a')}</p>
            <p>Updated: {format(new Date(casePlan.updatedAt), 'MMM dd, yyyy h:mm a')}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

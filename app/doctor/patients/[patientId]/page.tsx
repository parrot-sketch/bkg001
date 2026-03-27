'use client';

/**
 * Doctor Patient Profile Page
 * 
 * Comprehensive patient profile view for doctors with quick actions.
 * Modularized for better maintainability.
 */

import { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/patient/useAuth';
import { doctorApi } from '@/lib/api/doctor';
import { apiClient } from '@/lib/api/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Calendar, 
  Eye, 
  Play
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import Link from 'next/link';

// Components
import { StartConsultationDialog } from '@/components/doctor/StartConsultationDialog';
import { PatientProfileHeader } from './components/PatientProfileHeader';
import { PatientInfoSidebar } from './components/PatientInfoSidebar';
import { AppointmentsTab } from './components/AppointmentsTab';
import { MedicalHistoryTab } from './components/MedicalHistoryTab';
import { CasesProceduresTab } from './components/CasesProceduresTab';
import { ClinicalNotesTab } from './components/ClinicalNotesTab';

// DTOs & Enums
import type { PatientResponseDto } from '@/application/dtos/PatientResponseDto';
import type { VisitResponseDto } from '@/application/dtos/VisitResponseDto';
import type { AppointmentResponseDto } from '@/application/dtos/AppointmentResponseDto';
import { AppointmentStatus } from '@/domain/enums/AppointmentStatus';

export default function DoctorPatientProfilePage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const patientId = params.patientId as string;

  // Get navigation context from query params
  const fromConsultation = searchParams.get('from') === 'consultation';
  const consultationAppointmentId = searchParams.get('appointmentId');

  const [patient, setPatient] = useState<PatientResponseDto | null>(null);
  const [visits, setVisits] = useState<VisitResponseDto[]>([]);
  const [casePlans, setCasePlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingCasePlans, setLoadingCasePlans] = useState(false);
  const [startConsultationOpen, setStartConsultationOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<AppointmentResponseDto | null>(null);

  useEffect(() => {
    if (authLoading) return;

    if (!isAuthenticated || !user) {
      router.push('/login');
      return;
    }

    if (!patientId) {
      toast.error('Invalid patient ID');
      router.push('/doctor/patients');
      return;
    }

    loadPatientData();
  }, [isAuthenticated, user, patientId, authLoading, router]);

  const loadPatientData = async () => {
    try {
      setLoading(true);
      
      // Load patient details
      const patientResponse = await doctorApi.getPatient(patientId);
      if (patientResponse.success && patientResponse.data) {
        setPatient(patientResponse.data);
      } else {
        toast.error('Failed to load patient data');
        router.push('/doctor/patients');
        return;
      }

      // Load patient's full visit history (appointment + consultation + vitals + diagnosis + billing)
      const visitsResponse = await doctorApi.getPatientVisits(patientId);
      if (visitsResponse.success && visitsResponse.data) {
        setVisits(visitsResponse.data);
      }

      // Load case plans
      await loadCasePlans();
    } catch (error) {
      console.error('Error loading patient data:', error);
      toast.error('An error occurred while loading patient data');
    } finally {
      setLoading(false);
    }
  };

  const loadCasePlans = async () => {
    try {
      setLoadingCasePlans(true);
      const response = await apiClient.get<any[]>(`/patients/${patientId}/case-plans`);
      if (response.success && response.data) {
        setCasePlans(response.data);
      }
    } catch (error) {
      console.error('Error loading case plans:', error);
    } finally {
      setLoadingCasePlans(false);
    }
  };

  const handleStartConsultation = (appointment: AppointmentResponseDto) => {
    setSelectedAppointment(appointment);
    setStartConsultationOpen(true);
  };

  const handleConsultationSuccess = (appointmentId: number) => {
    toast.success('Consultation started successfully');
    setStartConsultationOpen(false);
    setSelectedAppointment(null);
    router.push(`/doctor/consultations/${appointmentId}/session`);
  };

  const getNextAppointment = (): VisitResponseDto | null => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return visits
      .filter((v) => {
        const vDate = new Date(v.date);
        vDate.setHours(0, 0, 0, 0);
        return (
          vDate >= today &&
          (v.status === AppointmentStatus.SCHEDULED ||
            v.status === AppointmentStatus.CONFIRMED ||
            v.status === AppointmentStatus.CHECKED_IN ||
            v.status === AppointmentStatus.READY_FOR_CONSULTATION)
        );
      })
      .sort((a, b) => 
        new Date(a.date).getTime() - new Date(b.date).getTime()
      )[0] || null;
  };

  const hasActiveConsultation = (appointmentId: number): boolean => {
    return fromConsultation && consultationAppointmentId === appointmentId.toString();
  };

  const getUpcomingAppointments = (): VisitResponseDto[] => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return visits
      .filter((v) => {
        const vDate = new Date(v.date);
        vDate.setHours(0, 0, 0, 0);
        return vDate >= today;
      })
      .sort((a, b) => 
        new Date(a.date).getTime() - new Date(b.date).getTime()
      );
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-sm text-muted-foreground">
            {authLoading ? 'Checking authentication...' : 'Loading patient profile...'}
          </p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-muted-foreground">Please log in to view patient profile</p>
        </div>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-muted-foreground">Patient not found</p>
          <Button onClick={() => router.push('/doctor/patients')} className="mt-4">
            Back to Patients
          </Button>
        </div>
      </div>
    );
  }

  const nextAppointment = getNextAppointment();
  const upcomingAppointmentsCount = getUpcomingAppointments().length;

  return (
    <div className="space-y-6">
      <PatientProfileHeader
        patientName={patient ? `${patient.firstName} ${patient.lastName}` : undefined}
        fromConsultation={fromConsultation}
        consultationAppointmentId={consultationAppointmentId}
        onBackToPatients={() => router.push('/doctor/patients')}
      />

      {/* Quick Actions Bar */}
      {nextAppointment && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Calendar className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Next Appointment</p>
                  <p className="font-semibold">
                    {format(new Date(nextAppointment.date), 'EEEE, MMMM dd, yyyy')} at {nextAppointment.time}
                  </p>
                  <p className="text-sm text-muted-foreground">{nextAppointment.type}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {hasActiveConsultation(nextAppointment.id) ? (
                  <Button
                    onClick={() => router.push(`/doctor/consultations/${nextAppointment.id}/session`)}
                    className="bg-primary hover:bg-primary/90"
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Continue Consultation
                  </Button>
                ) : (nextAppointment.status === AppointmentStatus.SCHEDULED || nextAppointment.status === AppointmentStatus.CONFIRMED) ? (
                  <Button
                    onClick={() => handleStartConsultation({
                      id: nextAppointment.id,
                      patientId: patientId,
                      doctorId: nextAppointment.doctor?.id || '',
                      appointmentDate: new Date(nextAppointment.date),
                      time: nextAppointment.time,
                      status: nextAppointment.status as any,
                      type: nextAppointment.type,
                      note: nextAppointment.note || undefined,
                    } as AppointmentResponseDto)}
                    className="bg-primary hover:bg-primary/90"
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Start Consultation
                  </Button>
                ) : null}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Patient Info */}
        <PatientInfoSidebar
          patient={patient}
          appointmentCount={visits.length}
          upcomingCount={upcomingAppointmentsCount}
        />

        {/* Right Column - Details */}
        <div className="lg:col-span-2 space-y-6">
          <Tabs defaultValue="appointments" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="appointments">Visits</TabsTrigger>
              <TabsTrigger value="medical">Medical History</TabsTrigger>
              <TabsTrigger value="cases">Cases & Procedures</TabsTrigger>
              <TabsTrigger value="notes">Notes</TabsTrigger>
            </TabsList>

            <TabsContent value="appointments" className="space-y-4">
              <AppointmentsTab
                visits={visits}
                hasActiveConsultation={hasActiveConsultation}
                onStartConsultation={handleStartConsultation}
                onContinueConsultation={(id) => router.push(`/doctor/consultations/${id}/session`)}
              />
            </TabsContent>

            <TabsContent value="medical" className="space-y-4">
              <MedicalHistoryTab patient={patient} />
            </TabsContent>

            <TabsContent value="cases" className="space-y-4">
              <CasesProceduresTab
                patientId={patientId}
                casePlans={casePlans}
                loading={loadingCasePlans}
              />
            </TabsContent>

            <TabsContent value="notes" className="space-y-4">
              <ClinicalNotesTab patientId={patientId} />
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Start Consultation Dialog */}
      {selectedAppointment && (
        <StartConsultationDialog
          open={startConsultationOpen}
          onClose={() => {
            setStartConsultationOpen(false);
            setSelectedAppointment(null);
          }}
          onSuccess={(appointmentId) => handleConsultationSuccess(appointmentId)}
          appointment={selectedAppointment}
          doctorId={user.id}
        />
      )}
    </div>
  );
}

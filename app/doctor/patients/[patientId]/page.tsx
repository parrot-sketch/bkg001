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
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import Link from 'next/link';

// Components
import { PatientProfileHeader } from './components/PatientProfileHeader';
import { PatientInfoSidebar } from './components/PatientInfoSidebar';
import { AppointmentsTab } from './components/AppointmentsTab';
import { ClinicalNotesTab } from './components/ClinicalNotesTab';

// DTOs & Enums
import type { PatientResponseDto } from '@/application/dtos/PatientResponseDto';
import type { VisitResponseDto } from '@/application/dtos/VisitResponseDto';

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

      // Case plans intentionally not loaded/shown on doctor patient profile
    } catch (error) {
      console.error('Error loading patient data:', error);
      toast.error('An error occurred while loading patient data');
    } finally {
      setLoading(false);
    }
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

  const upcomingAppointmentsCount = getUpcomingAppointments().length;

  return (
    <div className="space-y-6">
      <PatientProfileHeader
        patientName={patient ? `${patient.firstName} ${patient.lastName}` : undefined}
        fromConsultation={fromConsultation}
        consultationAppointmentId={consultationAppointmentId}
        onBackToPatients={() => router.push('/doctor/patients')}
      />

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
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="appointments">Visits</TabsTrigger>
              <TabsTrigger value="notes">Notes</TabsTrigger>
            </TabsList>

            <TabsContent value="appointments" className="space-y-4">
              <AppointmentsTab
                visits={visits}
              />
            </TabsContent>

            <TabsContent value="notes" className="space-y-4">
              <ClinicalNotesTab patientId={patientId} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

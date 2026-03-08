'use client';

/**
 * View Case Page - REFACTORED
 * 
 * Displays case details for a surgical appointment.
 * Shows appointment information, patient details, and case plan status.
 * Modularized into separate components for better maintainability.
 */

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/patient/useAuth';
import { doctorApi } from '@/lib/api/doctor';
import { ClinicalDashboardShell } from '@/components/layouts/ClinicalDashboardShell';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Calendar,
  Clock,
  ChevronRight,
  Activity
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import Link from 'next/link';
import type { AppointmentResponseDto } from '@/application/dtos/AppointmentResponseDto';
import type { PatientResponseDto } from '@/application/dtos/PatientResponseDto';
import { AppointmentStatus } from '@/domain/enums/AppointmentStatus';
import { cn } from '@/lib/utils';

// Refactored Components
import { WorkflowTimeline } from '../components/WorkflowTimeline';
import { CasePatientCard } from '../components/CasePatientCard';
import { CaseNotesCard } from '../components/CaseNotesCard';
import { CaseActionPanel } from '../components/CaseActionPanel';
import { ReadinessChecklist } from '../components/ReadinessChecklist';

export default function ViewCasePage() {
  const params = useParams();
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const appointmentId = params.appointmentId ? parseInt(params.appointmentId as string, 10) : null;

  const [appointment, setAppointment] = useState<AppointmentResponseDto | null>(null);
  const [patient, setPatient] = useState<PatientResponseDto | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;

    if (!isAuthenticated || !user) {
      router.push('/login');
      return;
    }

    if (!appointmentId) {
      toast.error('Invalid appointment ID');
      router.push('/doctor/dashboard');
      return;
    }

    loadCaseData();
  }, [appointmentId, isAuthenticated, user, authLoading, router]);

  const loadCaseData = async () => {
    if (!appointmentId) return;

    try {
      setLoading(true);

      const appointmentResponse = await doctorApi.getAppointment(appointmentId);
      if (!appointmentResponse.success || !appointmentResponse.data) {
        toast.error('Case not found');
        router.push('/doctor/dashboard');
        return;
      }

      const apt = appointmentResponse.data;
      setAppointment(apt);

      const patientResponse = await doctorApi.getPatient(apt.patientId);
      if (patientResponse.success && patientResponse.data) {
        setPatient(patientResponse.data);
      }
    } catch (error) {
      console.error('Error loading case data:', error);
      toast.error('Failed to load case data');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50">
        <div className="text-center">
          <div className="relative mb-4">
            <div className="h-16 w-16 rounded-full border-4 border-slate-200 border-t-indigo-500 animate-spin mx-auto" />
          </div>
          <p className="text-sm font-medium text-slate-500 animate-pulse">Retrieving case details...</p>
        </div>
      </div>
    );
  }

  if (!appointment) return null;

  const isCompleted = appointment.status === AppointmentStatus.COMPLETED;
  const isScheduled = appointment.status === AppointmentStatus.SCHEDULED;

  return (
    <ClinicalDashboardShell>
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

        {/* Navigation Breadcrumb */}
        <nav className="flex items-center text-sm text-muted-foreground">
          <Link href="/doctor/dashboard" className="hover:text-foreground transition-colors">Dashboard</Link>
          <ChevronRight className="h-4 w-4 mx-2" />
          <Link href="/doctor/appointments" className="hover:text-foreground transition-colors">Appointments</Link>
          <ChevronRight className="h-4 w-4 mx-2" />
          <span className="font-medium text-foreground">Case #{appointment.id}</span>
        </nav>

        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 border-b border-border pb-6">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">Case Overview</h1>
            <div className="flex items-center gap-3 text-sm text-slate-500">
              <Badge variant="outline" className={cn(
                "px-2.5 py-0.5 font-semibold border-transparent",
                isCompleted ? "bg-indigo-100 text-indigo-700" :
                  isScheduled ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-700"
              )}>
                {appointment.status}
              </Badge>
              <span>•</span>
              <span className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4" />
                {format(new Date(appointment.appointmentDate), 'EEEE, MMMM d, yyyy')}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1.5">
                <Clock className="h-4 w-4" />
                {appointment.time}
              </span>
            </div>
          </div>

          <div className="flex bg-white p-1 rounded-xl border border-slate-200 shadow-sm self-start">
            <Link href={`/doctor/operative/plan/${appointmentId}/new`}>
              <Button size="lg" className="bg-slate-900 hover:bg-slate-800 text-white shadow-lg shadow-slate-900/20 font-semibold gap-2">
                <Activity className="h-4 w-4" />
                Open Operative Plan
              </Button>
            </Link>
          </div>
        </div>

        <WorkflowTimeline status={appointment.status} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <CasePatientCard patient={patient} appointment={appointment} />
            <CaseNotesCard note={appointment.note ?? null} appointmentId={appointmentId!} />
          </div>

          <div className="space-y-6">
            <CaseActionPanel appointmentId={appointmentId!} />
            <ReadinessChecklist patient={patient} isCompleted={isCompleted} />
          </div>
        </div>
      </div>
    </ClinicalDashboardShell>
  );
}

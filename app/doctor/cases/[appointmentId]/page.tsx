'use client';

/**
 * View Case Page
 * 
 * Displays case details for a surgical appointment.
 * Shows appointment information, patient details, and case plan status.
 * 
 * Route: /doctor/cases/[appointmentId]
 */

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/patient/useAuth';
import { doctorApi } from '@/lib/api/doctor';
import { ClinicalDashboardShell } from '@/components/layouts/ClinicalDashboardShell';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Calendar,
  Clock,
  User,
  FileText,
  AlertCircle,
  CheckCircle2,
  ArrowLeft,
  ChevronRight,
  Activity,
  Shield,
  Stethoscope,
  Microscope,
  Play
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import Link from 'next/link';
import type { AppointmentResponseDto } from '@/application/dtos/AppointmentResponseDto';
import type { PatientResponseDto } from '@/application/dtos/PatientResponseDto';
import { AppointmentStatus } from '@/domain/enums/AppointmentStatus';
import { cn } from '@/lib/utils';
import { ProfileImage } from '@/components/profile-image';

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

      // Load appointment
      const appointmentResponse = await doctorApi.getAppointment(appointmentId);
      if (!appointmentResponse.success || !appointmentResponse.data) {
        toast.error('Case not found');
        router.push('/doctor/dashboard');
        return;
      }

      const apt = appointmentResponse.data;
      setAppointment(apt);

      // Load patient
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

  if (!appointment) {
    return null; // Handled by redirect
  }

  const patientName = patient
    ? `${patient.firstName} ${patient.lastName}`
    : `Patient ${appointment.patientId}`;

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

        {/* Workflow Timeline (Visual Indicator) */}
        <div className="hidden md:flex items-center justify-between px-10 py-6 bg-white border border-slate-200 rounded-2xl shadow-sm">
          <Step indicator="1" label="Consultation" active completed={isCompleted || isScheduled} />
          <Connector active={isCompleted || isScheduled} />
          <Step indicator="2" label="Case Planning" active={isCompleted} />
          <Connector />
          <Step indicator="3" label="Pre-Op" />
          <Connector />
          <Step indicator="4" label="Surgery" />
          <Connector />
          <Step indicator="5" label="Recovery" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Main Content (2 cols) */}
          <div className="lg:col-span-2 space-y-8">

            {/* Patient Card - Enhanced */}
            <Card className="border-slate-200 shadow-sm overflow-hidden">
              <div className="bg-slate-50/50 p-6 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <ProfileImage name={patientName} className="h-16 w-16 text-lg" />
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">{patientName}</h2>
                    <p className="text-sm text-slate-500">
                      {patient?.gender} • {patient?.dateOfBirth ? format(new Date(patient.dateOfBirth), 'yyyy') : 'Unknown'}
                    </p>
                  </div>
                </div>
                <Link href={`/doctor/patients/${appointment.patientId}`}>
                  <Button variant="outline" size="sm">View Profile</Button>
                </Link>
              </div>
              <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                <InfoItem icon={FileText} label="File Number" value={patient?.fileNumber || "N/A"} />
                <InfoItem icon={Stethoscope} label="Visit Type" value={appointment.type || "General Consultation"} />
                {patient?.phone && <InfoItem icon={User} label="Contact" value={patient.phone} />}
                {patient?.allergies && <InfoItem icon={AlertCircle} label="Allergies" value={patient.allergies} highlight />}
              </CardContent>
            </Card>

            {/* Notes Section */}
            <Card className="border-slate-200 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-slate-400" />
                  Clinical Notes
                </CardTitle>
              </CardHeader>
              <CardContent>
                {appointment.note ? (
                  <div className="bg-yellow-50/50 p-6 rounded-xl border border-yellow-100 text-slate-800 text-sm leading-relaxed">
                    {appointment.note}
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-400 text-sm italic">
                    No preliminary notes recorded for this appointment.
                  </div>
                )}
              </CardContent>
              <CardFooter className="border-t bg-slate-50/50 p-4">
                <Link href={`/doctor/consultations/${appointmentId}/session`} className="w-full">
                  <Button variant="outline" className="w-full gap-2">
                    <Play className="h-4 w-4" />
                    View Full Consultation Session
                  </Button>
                </Link>
              </CardFooter>
            </Card>

          </div>

          {/* Sidebar (1 col) */}
          <div className="space-y-6">

            {/* Action Panel */}
            <Card className="border-indigo-100 bg-indigo-50/30 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-100/50 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />
              <CardHeader>
                <CardTitle className="text-indigo-900">Next Actions</CardTitle>
                <CardDescription className="text-indigo-700/80">Recommended steps for this case</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 relative z-10">
                <Link href={`/doctor/operative/plan/${appointmentId}/new`}>
                  <Button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-200" size="lg">
                    Plan Surgery
                  </Button>
                </Link>
                <Link href={`/doctor/consultations/${appointmentId}/session`}>
                  <Button variant="outline" className="w-full bg-white hover:bg-slate-50 border-indigo-200 text-indigo-700">
                    Resume Consultation
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Readiness Checklist */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Shield className="h-4 w-4 text-emerald-500" />
                  Surgical Readiness
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <CheckItem label="Patient Demographics" checked={!!patient} />
                <CheckItem label="Consultation Completed" checked={isCompleted} />
                <CheckItem label="Operative Plan" checked={false} />
                <CheckItem label="Consents Signed" checked={false} />
              </CardContent>
            </Card>

          </div>

        </div>

      </div>
    </ClinicalDashboardShell>
  );
}

function InfoItem({ icon: Icon, label, value, highlight }: any) {
  return (
    <div className="flex items-start gap-3">
      <div className={cn("mt-1 p-1.5 rounded-lg", highlight ? "bg-rose-100 text-rose-600" : "bg-slate-100 text-slate-500")}>
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{label}</p>
        <p className={cn("font-medium", highlight ? "text-rose-700" : "text-slate-900")}>{value}</p>
      </div>
    </div>
  );
}

function Step({ indicator, label, active, completed }: any) {
  return (
    <div className="flex flex-col items-center gap-2 relative z-10">
      <div className={cn(
        "h-10 w-10 rounded-full flex items-center justify-center font-bold text-sm transition-all shadow-sm ring-4 ring-white",
        completed ? "bg-emerald-500 text-white" :
          active ? "bg-indigo-600 text-white shadow-indigo-200" :
            "bg-slate-100 text-slate-400"
      )}>
        {completed ? <CheckCircle2 className="h-5 w-5" /> : indicator}
      </div>
      <span className={cn(
        "text-xs font-bold uppercase tracking-wider",
        active || completed ? "text-slate-900" : "text-slate-400"
      )}>{label}</span>
    </div>
  )
}

function Connector({ active }: { active?: boolean }) {
  return (
    <div className={cn(
      "h-0.5 flex-1 mx-4 -mt-6 transition-colors duration-500",
      active ? "bg-emerald-500" : "bg-slate-100"
    )} />
  );
}

function CheckItem({ label, checked }: any) {
  return (
    <div className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 transition-colors">
      <span className={cn("text-sm font-medium", checked ? "text-slate-700" : "text-slate-400")}>{label}</span>
      {checked ? (
        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
      ) : (
        <div className="h-4 w-4 rounded-full border-2 border-slate-200" />
      )}
    </div>
  )
}

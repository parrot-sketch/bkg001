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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, User, FileText, AlertCircle, CheckCircle2, ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import Link from 'next/link';
import type { AppointmentResponseDto } from '@/application/dtos/AppointmentResponseDto';
import type { PatientResponseDto } from '@/application/dtos/PatientResponseDto';
import { AppointmentStatus } from '@/domain/enums/AppointmentStatus';
import { CaseReadinessStatus, getCaseReadinessStatusLabel } from '@/domain/enums/CaseReadinessStatus';

export default function ViewCasePage() {
  const params = useParams();
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const appointmentId = params.appointmentId ? parseInt(params.appointmentId as string, 10) : null;

  const [appointment, setAppointment] = useState<AppointmentResponseDto | null>(null);
  const [patient, setPatient] = useState<PatientResponseDto | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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
  }, [appointmentId, isAuthenticated, user]);

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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading case...</p>
        </div>
      </div>
    );
  }

  if (!appointment) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-muted-foreground">Case not found</p>
          <Link href="/doctor/dashboard">
            <Button className="mt-4">Return to Dashboard</Button>
          </Link>
        </div>
      </div>
    );
  }

  const patientName = patient 
    ? `${patient.firstName} ${patient.lastName}`
    : `Patient ${appointment.patientId}`;

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/doctor/dashboard">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-semibold">Case Details</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {format(new Date(appointment.appointmentDate), 'MMMM d, yyyy')} at {appointment.time}
            </p>
          </div>
        </div>
        <Link href={`/doctor/cases/${appointmentId}/plan`}>
          <Button>Plan Case</Button>
        </Link>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Appointment Information */}
        <Card>
          <CardHeader>
            <CardTitle>Appointment Information</CardTitle>
            <CardDescription>Schedule and status details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">
                <strong>Date:</strong> {format(new Date(appointment.appointmentDate), 'MMMM d, yyyy')}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">
                <strong>Time:</strong> {appointment.time}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">
                <strong>Type:</strong> {appointment.type || 'Consultation'}
              </span>
            </div>
            <div>
              <span className="text-sm font-medium">Status:</span>
              <Badge className="ml-2" variant={
                appointment.status === AppointmentStatus.COMPLETED ? 'default' :
                appointment.status === AppointmentStatus.SCHEDULED ? 'secondary' :
                'outline'
              }>
                {appointment.status}
              </Badge>
            </div>
            {appointment.note && (
              <div>
                <span className="text-sm font-medium">Notes:</span>
                <p className="text-sm text-muted-foreground mt-1">{appointment.note}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Patient Information */}
        <Card>
          <CardHeader>
            <CardTitle>Patient Information</CardTitle>
            <CardDescription>Patient details for this case</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">
                <strong>Name:</strong> {patientName}
              </span>
            </div>
            {patient && (
              <>
                {patient.dateOfBirth && (
                  <div className="text-sm">
                    <strong>Date of Birth:</strong> {format(new Date(patient.dateOfBirth), 'MMMM d, yyyy')}
                  </div>
                )}
                {patient.gender && (
                  <div className="text-sm">
                    <strong>Gender:</strong> {patient.gender}
                  </div>
                )}
                {patient.phone && (
                  <div className="text-sm">
                    <strong>Phone:</strong> {patient.phone}
                  </div>
                )}
                {patient.email && (
                  <div className="text-sm">
                    <strong>Email:</strong> {patient.email}
                  </div>
                )}
              </>
            )}
            <Link href={`/doctor/patients/${appointment.patientId}`}>
              <Button variant="outline" size="sm">View Full Patient Profile</Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Case Plan Status */}
      <Card>
        <CardHeader>
          <CardTitle>Case Plan Status</CardTitle>
          <CardDescription>Readiness and planning information</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-2">
                Case planning status and readiness information will appear here once the case plan is created.
              </p>
              <p className="text-xs text-muted-foreground">
                Use the "Plan Case" button to create or update the case plan.
              </p>
            </div>
            <Link href={`/doctor/cases/${appointmentId}/plan`}>
              <Button>Plan Case</Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-4">
        <Link href={`/doctor/consultations/${appointmentId}/session`}>
          <Button variant="outline">View Consultation</Button>
        </Link>
        <Link href={`/doctor/appointments`}>
          <Button variant="outline">Back to Appointments</Button>
        </Link>
      </div>
    </div>
  );
}

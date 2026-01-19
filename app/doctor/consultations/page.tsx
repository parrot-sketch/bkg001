'use client';

/**
 * Doctor Consultations Page
 * 
 * View and manage all consultations.
 * Shows consultation history and allows viewing notes.
 */

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/patient/useAuth';
import { doctorApi } from '@/lib/api/doctor';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Calendar, Clock } from 'lucide-react';
import { toast } from 'sonner';
import type { AppointmentResponseDto } from '@/application/dtos/AppointmentResponseDto';
import { AppointmentStatus } from '@/domain/enums/AppointmentStatus';
import { format } from 'date-fns';

export default function DoctorConsultationsPage() {
  const { user, isAuthenticated } = useAuth();
  const [consultations, setConsultations] = useState<AppointmentResponseDto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isAuthenticated && user) {
      loadConsultations();
    }
  }, [isAuthenticated, user]);

  const loadConsultations = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const response = await doctorApi.getAppointments(user.id);

      if (response.success && response.data) {
        // Filter for consultations (appointments with notes or completed)
        const consultationAppointments = response.data.filter(
          (apt) =>
            apt.status === AppointmentStatus.COMPLETED ||
            apt.note ||
            apt.status === AppointmentStatus.SCHEDULED,
        );
        setConsultations(consultationAppointments);
      } else {
        toast.error(response.error || 'Failed to load consultations');
      }
    } catch (error) {
      toast.error('An error occurred while loading consultations');
      console.error('Error loading consultations:', error);
    } finally {
      setLoading(false);
    }
  };

  const completedConsultations = consultations.filter(
    (apt) => apt.status === AppointmentStatus.COMPLETED,
  );

  const inProgressConsultations = consultations.filter(
    (apt) =>
      apt.status === AppointmentStatus.SCHEDULED && apt.note && apt.status !== AppointmentStatus.COMPLETED,
  );

  if (!isAuthenticated || !user) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-muted-foreground">Please log in to view consultations</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Consultations</h1>
        <p className="mt-2 text-muted-foreground">View and manage your consultations</p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Consultations</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{consultations.length}</div>
            <p className="text-xs text-muted-foreground">All consultations</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{inProgressConsultations.length}</div>
            <p className="text-xs text-muted-foreground">Active consultations</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedConsultations.length}</div>
            <p className="text-xs text-muted-foreground">Finished consultations</p>
          </CardContent>
        </Card>
      </div>

      {/* In Progress Consultations */}
      {inProgressConsultations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>In Progress Consultations</CardTitle>
            <CardDescription>Consultations currently in progress</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {inProgressConsultations.map((consultation) => (
                <ConsultationCard key={consultation.id} consultation={consultation} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Completed Consultations */}
      <Card>
        <CardHeader>
          <CardTitle>Completed Consultations</CardTitle>
          <CardDescription>Your consultation history</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-4 text-sm text-muted-foreground">Loading consultations...</p>
            </div>
          ) : completedConsultations.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-sm text-muted-foreground">No completed consultations yet</p>
            </div>
          ) : (
            <div className="space-y-6">
              {completedConsultations.map((consultation) => (
                <ConsultationCard key={consultation.id} consultation={consultation} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

interface ConsultationCardProps {
  consultation: AppointmentResponseDto;
}

function ConsultationCard({ consultation }: ConsultationCardProps) {
  const isCompleted = consultation.status === AppointmentStatus.COMPLETED;

  return (
    <div className="rounded-lg border border-border p-6 hover:bg-muted/50 transition-colors">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-4">
          <div
            className={`flex h-12 w-12 items-center justify-center rounded-lg ${
              isCompleted ? 'bg-success/10' : 'bg-primary/10'
            }`}
          >
            <FileText className={`h-6 w-6 ${isCompleted ? 'text-success' : 'text-primary'}`} />
          </div>
          <div>
            <h3 className="font-semibold text-lg">
              {format(new Date(consultation.appointmentDate), 'MMMM d, yyyy')}
            </h3>
            <p className="text-sm text-muted-foreground">
              {consultation.time} • Patient: {consultation.patientId} • {consultation.type}
            </p>
          </div>
        </div>
        <div
          className={`rounded-full px-3 py-1 text-xs font-medium ${
            isCompleted
              ? 'bg-success/10 text-success'
              : 'bg-primary/10 text-primary'
          }`}
        >
          {consultation.status}
        </div>
      </div>

      {consultation.note && (
        <div className="mb-4 rounded-lg bg-muted p-4">
          <h4 className="mb-2 text-sm font-medium text-foreground">Consultation Notes</h4>
          <p className="text-sm text-muted-foreground">{consultation.note}</p>
        </div>
      )}

      {consultation.reason && (
        <div className="rounded-lg border border-border p-4">
          <h4 className="mb-2 text-sm font-medium text-foreground">Outcome</h4>
          <p className="text-sm text-muted-foreground">{consultation.reason}</p>
        </div>
      )}

      <div className="mt-4 flex items-center text-xs text-muted-foreground">
        <Calendar className="mr-2 h-4 w-4" />
        {isCompleted && consultation.updatedAt
          ? `Completed on ${format(new Date(consultation.updatedAt), 'MMMM d, yyyy')}`
          : `Scheduled for ${format(new Date(consultation.appointmentDate), 'MMMM d, yyyy')}`}
      </div>
    </div>
  );
}

'use client';

/**
 * Patient Appointments Page
 * 
 * View and schedule appointments.
 * Shows all appointments (upcoming and history) with ability to schedule new ones.
 * Displays consultation request status and status-driven actions.
 */

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/patient/useAuth';
import { patientApi } from '@/lib/api/patient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, FileText, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import type { AppointmentResponseDto } from '@/application/dtos/AppointmentResponseDto';
import { AppointmentStatus } from '@/domain/enums/AppointmentStatus';
import { ConsultationRequestStatus } from '@/domain/enums/ConsultationRequestStatus';
import { getConsultationRequestStatusLabel, getConsultationRequestStatusDescription } from '@/domain/enums/ConsultationRequestStatus';
import { format } from 'date-fns';
import { AppointmentCard } from '@/components/patient/AppointmentCard';
import { ConfirmConsultationDialog } from '@/components/patient/ConfirmConsultationDialog';
import { RespondToInfoRequestDialog } from '@/components/patient/RespondToInfoRequestDialog';
import { ConsultationCTA } from '@/components/portal/ConsultationCTA';

export default function PatientAppointmentsPage() {
  const { user, isAuthenticated } = useAuth();
  const [appointments, setAppointments] = useState<AppointmentResponseDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAppointment, setSelectedAppointment] = useState<AppointmentResponseDto | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showRespondDialog, setShowRespondDialog] = useState(false);

  // Load appointments on mount and when auth state changes
  useEffect(() => {
    if (isAuthenticated && user) {
      loadAppointments();
    }
  }, [isAuthenticated, user]);

  // Refresh appointments when window regains focus (user returns from booking or other tab)
  useEffect(() => {
    const handleFocus = () => {
      if (isAuthenticated && user && !loading) {
        loadAppointments();
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [isAuthenticated, user, loading]);

  const loadAppointments = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const response = await patientApi.getAppointments(user.id);

      if (response.success && response.data) {
        setAppointments(response.data);
      } else {
        toast.error(response.error || 'Failed to load appointments');
      }
    } catch (error) {
      toast.error('An error occurred while loading appointments');
      console.error('Error loading appointments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmSuccess = () => {
    setShowConfirmDialog(false);
    setSelectedAppointment(null);
    loadAppointments();
  };

  const handleRespondSuccess = () => {
    setShowRespondDialog(false);
    setSelectedAppointment(null);
    loadAppointments();
  };

  const handleConfirmClick = (appointment: AppointmentResponseDto) => {
    setSelectedAppointment(appointment);
    setShowConfirmDialog(true);
  };

  const handleRespondClick = (appointment: AppointmentResponseDto) => {
    setSelectedAppointment(appointment);
    setShowRespondDialog(true);
  };

  const upcomingAppointments = appointments.filter(
    (apt) =>
      new Date(apt.appointmentDate) >= new Date() &&
      (apt.status === AppointmentStatus.PENDING || apt.status === AppointmentStatus.SCHEDULED),
  );

  const pastAppointments = appointments.filter(
    (apt) =>
      new Date(apt.appointmentDate) < new Date() ||
      apt.status === AppointmentStatus.COMPLETED ||
      apt.status === AppointmentStatus.CANCELLED,
  );

  if (!isAuthenticated || !user) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-muted-foreground">Please log in to view appointments</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Appointments</h1>
          <p className="mt-2 text-muted-foreground">Manage your appointments</p>
        </div>
        <ConsultationCTA variant="primary" />
      </div>

      {/* Upcoming Appointments */}
      <Card>
        <CardHeader>
          <CardTitle>Upcoming Appointments</CardTitle>
          <CardDescription>Your scheduled and pending appointments</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-4 text-sm text-muted-foreground">Loading...</p>
            </div>
          ) : upcomingAppointments.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-sm text-muted-foreground">No upcoming appointments</p>
              <div className="flex justify-center mt-4">
                <ConsultationCTA variant="secondary" className="h-9 px-4 text-sm" />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {upcomingAppointments.map((appointment) => (
                <PatientAppointmentCard
                  key={appointment.id}
                  appointment={appointment}
                  onConfirm={handleConfirmClick}
                  onRespond={handleRespondClick}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Past Appointments */}
      <Card>
        <CardHeader>
          <CardTitle>Appointment History</CardTitle>
          <CardDescription>Your past appointments and consultations</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-4 text-sm text-muted-foreground">Loading...</p>
            </div>
          ) : pastAppointments.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-sm text-muted-foreground">No past appointments</p>
            </div>
          ) : (
            <div className="space-y-4">
              {pastAppointments.map((appointment) => (
                <AppointmentCard key={appointment.id} appointment={appointment} showDoctorInfo={true} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Confirm Consultation Dialog */}
      {showConfirmDialog && selectedAppointment && (
        <ConfirmConsultationDialog
          open={showConfirmDialog}
          onClose={() => {
            setShowConfirmDialog(false);
            setSelectedAppointment(null);
          }}
          onSuccess={handleConfirmSuccess}
          appointment={selectedAppointment}
        />
      )}

      {/* Respond to Info Request Dialog */}
      {showRespondDialog && selectedAppointment && (
        <RespondToInfoRequestDialog
          open={showRespondDialog}
          onClose={() => {
            setShowRespondDialog(false);
            setSelectedAppointment(null);
          }}
          onSuccess={handleRespondSuccess}
          appointment={selectedAppointment}
        />
      )}
    </div>
  );
}

/**
 * Patient-specific appointment card with consultation status and actions
 */
interface PatientAppointmentCardProps {
  appointment: AppointmentResponseDto;
  onConfirm: (appointment: AppointmentResponseDto) => void;
  onRespond: (appointment: AppointmentResponseDto) => void;
}

function PatientAppointmentCard({ appointment, onConfirm, onRespond }: PatientAppointmentCardProps) {
  const consultationStatus = appointment.consultationRequestStatus;
  const needsAction = consultationStatus === ConsultationRequestStatus.NEEDS_MORE_INFO ||
    consultationStatus === ConsultationRequestStatus.SCHEDULED;

  const getStatusColor = (status?: ConsultationRequestStatus) => {
    if (!status) return 'text-muted-foreground';
    switch (status) {
      case ConsultationRequestStatus.SUBMITTED:
      case ConsultationRequestStatus.PENDING_REVIEW:
        return 'text-yellow-600';
      case ConsultationRequestStatus.NEEDS_MORE_INFO:
        return 'text-orange-600';
      case ConsultationRequestStatus.SCHEDULED:
        return 'text-blue-600';
      case ConsultationRequestStatus.CONFIRMED:
        return 'text-green-600';
      default:
        return 'text-muted-foreground';
    }
  };

  return (
    <div className="rounded-lg border border-border p-4 hover:bg-muted/50 transition-colors space-y-3">
      <AppointmentCard appointment={appointment} showDoctorInfo={true} />

      {/* Consultation Request Status */}
      {consultationStatus && (
        <div className="border-t border-border pt-3 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <AlertCircle className={`h-4 w-4 ${getStatusColor(consultationStatus)}`} />
              <span className="text-sm font-medium">Consultation Status:</span>
              <span className={`text-sm font-medium ${getStatusColor(consultationStatus)}`}>
                {getConsultationRequestStatusLabel(consultationStatus)}
              </span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            {getConsultationRequestStatusDescription(consultationStatus)}
          </p>

          {/* Status-driven Actions */}
          {needsAction && (
            <div className="pt-2">
              {consultationStatus === ConsultationRequestStatus.NEEDS_MORE_INFO && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onRespond(appointment)}
                  className="w-full"
                >
                  Respond to Request
                </Button>
              )}
              {consultationStatus === ConsultationRequestStatus.SCHEDULED && (
                <Button
                  size="sm"
                  onClick={() => onConfirm(appointment)}
                  className="w-full"
                >
                  Confirm Appointment
                </Button>
              )}
            </div>
          )}

          {/* Review Notes (if any) */}
          {appointment.reviewNotes && (
            <div className="rounded bg-muted/50 p-3 mt-2">
              <p className="text-xs font-medium mb-1">Note from clinic:</p>
              <p className="text-xs text-muted-foreground whitespace-pre-wrap">
                {appointment.reviewNotes}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

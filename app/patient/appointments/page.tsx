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
import { Calendar, Clock, FileText, AlertCircle, Sparkles } from 'lucide-react';
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
      } else if (!response.success) {
        toast.error(response.error || 'Failed to load appointments');
      } else {
        toast.error('Failed to load appointments');
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

  // Separate consultation inquiries from regular appointments
  // Consultation inquiries get priority and are shown first
  const consultationInquiries = appointments.filter((apt) => {
    const hasConsultationStatus = apt.consultationRequestStatus !== undefined;
    const isCancelledOrCompleted = 
      apt.status === AppointmentStatus.CANCELLED || 
      apt.status === AppointmentStatus.COMPLETED;
    return hasConsultationStatus && !isCancelledOrCompleted;
  });

  // Regular upcoming appointments (without consultation status)
  const regularUpcomingAppointments = appointments.filter((apt) => {
    const isFuture = new Date(apt.appointmentDate) >= new Date();
    const hasConsultationStatus = apt.consultationRequestStatus !== undefined;
    const isActiveStatus = 
      apt.status === AppointmentStatus.PENDING || 
      apt.status === AppointmentStatus.SCHEDULED ||
      apt.status === AppointmentStatus.CONFIRMED;
    const isCancelledOrCompleted = 
      apt.status === AppointmentStatus.CANCELLED || 
      apt.status === AppointmentStatus.COMPLETED;
    
    // Include if: Future appointment with active status and no consultation status
    return !hasConsultationStatus && isFuture && isActiveStatus && !isCancelledOrCompleted;
  });

  // Combine: inquiries first, then regular appointments
  const upcomingAppointments = [...consultationInquiries, ...regularUpcomingAppointments];

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
    <div className="space-y-8 pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold text-foreground tracking-tight">Your Inquiries</h1>
          <p className="text-sm text-muted-foreground leading-relaxed">Track your consultation inquiries and sessions</p>
        </div>
        <ConsultationCTA variant="primary" />
      </div>

      {/* Consultation Inquiries - Priority Section */}
      {consultationInquiries.length > 0 && (
        <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 via-primary/5 to-primary/10">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <CardTitle className="text-xl">Consultation Inquiries</CardTitle>
              <span className="ml-auto px-2 py-1 text-xs font-semibold bg-primary/20 text-primary rounded-full">
                {consultationInquiries.length} {consultationInquiries.length === 1 ? 'inquiry' : 'inquiries'}
              </span>
            </div>
            <CardDescription>Your consultation requests that need attention</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {consultationInquiries.map((appointment) => (
                <PatientAppointmentCard
                  key={appointment.id}
                  appointment={appointment}
                  onConfirm={handleConfirmClick}
                  onRespond={handleRespondClick}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Regular Upcoming Sessions */}
      <Card>
        <CardHeader>
          <CardTitle>
            {consultationInquiries.length > 0 ? 'Confirmed Sessions' : 'Upcoming Sessions'}
          </CardTitle>
          <CardDescription>
            {consultationInquiries.length > 0 
              ? 'Your confirmed and scheduled appointments'
              : 'Your confirmed and scheduled sessions'}
          </CardDescription>
        </CardHeader>
        <CardContent>
                      {loading ? (
                        <div className="text-center py-12">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                          <p className="text-sm text-muted-foreground">Loading sessions...</p>
                        </div>
                      ) : upcomingAppointments.length === 0 ? (
                        <div className="text-center py-12">
                          <div className="h-16 w-16 rounded-full bg-gray-50 flex items-center justify-center mx-auto mb-4">
                            <Calendar className="h-8 w-8 text-gray-400" />
                          </div>
                          <p className="text-sm font-medium text-gray-600 mb-1">No upcoming sessions</p>
                          <p className="text-xs text-gray-500 mb-6">Submit an inquiry to begin</p>
                          <div className="flex justify-center">
                            <ConsultationCTA variant="secondary" className="h-9 px-4 text-sm" />
                          </div>
                        </div>
                      ) : (
            <div className="space-y-4">
              {regularUpcomingAppointments.map((appointment) => (
                <AppointmentCard key={appointment.id} appointment={appointment} showDoctorInfo={true} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Session History */}
      <Card>
        <CardHeader>
          <CardTitle>Session History</CardTitle>
          <CardDescription>Your completed sessions and consultations</CardDescription>
        </CardHeader>
        <CardContent>
                      {loading ? (
                        <div className="text-center py-12">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                          <p className="text-sm text-muted-foreground">Loading history...</p>
                        </div>
                      ) : pastAppointments.length === 0 ? (
                        <div className="text-center py-12">
                          <div className="h-16 w-16 rounded-full bg-gray-50 flex items-center justify-center mx-auto mb-4">
                            <FileText className="h-8 w-8 text-gray-400" />
                          </div>
                          <p className="text-sm font-medium text-gray-600 mb-1">No completed sessions</p>
                          <p className="text-xs text-gray-500">Your consultation history will appear here</p>
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
    consultationStatus === ConsultationRequestStatus.SCHEDULED ||
    consultationStatus === ConsultationRequestStatus.APPROVED; // Show approved consultations too

  const getStatusColor = (status?: ConsultationRequestStatus) => {
    if (!status) return 'text-muted-foreground';
    switch (status) {
      case ConsultationRequestStatus.SUBMITTED:
      case ConsultationRequestStatus.PENDING_REVIEW:
        return 'text-yellow-600';
      case ConsultationRequestStatus.NEEDS_MORE_INFO:
        return 'text-orange-600';
      case ConsultationRequestStatus.APPROVED:
        return 'text-teal-600';
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
              <span className="text-sm font-medium">Inquiry Status:</span>
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
                  Provide Clarification
                </Button>
              )}
              {consultationStatus === ConsultationRequestStatus.APPROVED && (
                <div className="text-xs text-muted-foreground p-2 bg-teal-50 rounded border border-teal-200">
                  <p className="font-medium text-teal-800 mb-1">Accepted for Scheduling</p>
                  <p className="text-teal-700">Our team will contact you shortly to schedule your session.</p>
                </div>
              )}
              {consultationStatus === ConsultationRequestStatus.SCHEDULED && (
                <Button
                  size="sm"
                  onClick={() => onConfirm(appointment)}
                  className="w-full"
                >
                  Confirm Session
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

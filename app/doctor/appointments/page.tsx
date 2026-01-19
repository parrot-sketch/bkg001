'use client';

/**
 * Doctor Appointments Page
 * 
 * View and manage all appointments assigned to the doctor.
 * Includes check-in, consultation start/complete actions.
 */

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/patient/useAuth';
import { doctorApi } from '@/lib/api/doctor';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, CheckCircle, FileText } from 'lucide-react';
import { toast } from 'sonner';
import type { AppointmentResponseDto } from '@/application/dtos/AppointmentResponseDto';
import { AppointmentStatus } from '@/domain/enums/AppointmentStatus';
import { format } from 'date-fns';
import { StartConsultationDialog } from '../../../../components/doctor/StartConsultationDialog';
import { CompleteConsultationDialog } from '../../../../components/doctor/CompleteConsultationDialog';
import { AppointmentCard } from '@/components/patient/AppointmentCard';

export default function DoctorAppointmentsPage() {
  const { user, isAuthenticated } = useAuth();
  const [appointments, setAppointments] = useState<AppointmentResponseDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAppointment, setSelectedAppointment] = useState<AppointmentResponseDto | null>(null);
  const [showStartConsultation, setShowStartConsultation] = useState(false);
  const [showCompleteConsultation, setShowCompleteConsultation] = useState(false);

  useEffect(() => {
    if (isAuthenticated && user) {
      loadAppointments();
    }
  }, [isAuthenticated, user]);

  const loadAppointments = async () => {
    if (!user) return;

    try {
      setLoading(true);
      // getAppointments now uses the new endpoint which filters to only SCHEDULED/CONFIRMED
      // by default, ensuring doctors never see unreviewed consultation requests
      const response = await doctorApi.getAppointments(user.id);

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

  const handleCheckIn = async (appointmentId: number) => {
    if (!user) return;

    try {
      const response = await doctorApi.checkInPatient(appointmentId, user.id);

      if (response.success) {
        toast.success('Patient checked in successfully');
        loadAppointments();
      } else {
        toast.error(response.error || 'Failed to check in patient');
      }
    } catch (error) {
      toast.error('An error occurred while checking in patient');
      console.error('Error checking in patient:', error);
    }
  };

  const handleStartConsultation = (appointment: AppointmentResponseDto) => {
    setSelectedAppointment(appointment);
    setShowStartConsultation(true);
  };

  const handleCompleteConsultation = (appointment: AppointmentResponseDto) => {
    setSelectedAppointment(appointment);
    setShowCompleteConsultation(true);
  };

  const handleConsultationSuccess = () => {
    setShowStartConsultation(false);
    setShowCompleteConsultation(false);
    setSelectedAppointment(null);
    loadAppointments();
  };

  const upcomingAppointments = appointments.filter(
    (apt) =>
      new Date(apt.appointmentDate) >= new Date() &&
      (apt.status === AppointmentStatus.PENDING ||
        apt.status === AppointmentStatus.SCHEDULED),
  );

  const todayAppointments = appointments.filter((apt) => {
    const aptDate = new Date(apt.appointmentDate);
    const today = new Date();
    return (
      aptDate.getDate() === today.getDate() &&
      aptDate.getMonth() === today.getMonth() &&
      aptDate.getFullYear() === today.getFullYear()
    );
  });

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
      <div>
        <h1 className="text-3xl font-bold text-foreground">Appointments</h1>
        <p className="mt-2 text-muted-foreground">Manage your appointments and consultations</p>
      </div>

      {/* Today's Appointments */}
      {todayAppointments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Today's Appointments</CardTitle>
            <CardDescription>Appointments scheduled for today</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {todayAppointments.map((appointment) => (
                <DoctorAppointmentCard
                  key={appointment.id}
                  appointment={appointment}
                  onCheckIn={handleCheckIn}
                  onStartConsultation={handleStartConsultation}
                  onCompleteConsultation={handleCompleteConsultation}
                  doctorId={user.id}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* All Appointments */}
      <Card>
        <CardHeader>
          <CardTitle>All Appointments</CardTitle>
          <CardDescription>Your complete appointment list</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-4 text-sm text-muted-foreground">Loading appointments...</p>
            </div>
          ) : appointments.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-sm text-muted-foreground">No appointments found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {appointments.map((appointment) => (
                <DoctorAppointmentCard
                  key={appointment.id}
                  appointment={appointment}
                  onCheckIn={handleCheckIn}
                  onStartConsultation={handleStartConsultation}
                  onCompleteConsultation={handleCompleteConsultation}
                  doctorId={user.id}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Start Consultation Dialog */}
      {showStartConsultation && selectedAppointment && (
        <StartConsultationDialog
          open={showStartConsultation}
          onClose={() => {
            setShowStartConsultation(false);
            setSelectedAppointment(null);
          }}
          onSuccess={handleConsultationSuccess}
          appointment={selectedAppointment}
          doctorId={user.id}
        />
      )}

      {/* Complete Consultation Dialog */}
      {showCompleteConsultation && selectedAppointment && (
        <CompleteConsultationDialog
          open={showCompleteConsultation}
          onClose={() => {
            setShowCompleteConsultation(false);
            setSelectedAppointment(null);
          }}
          onSuccess={handleConsultationSuccess}
          appointment={selectedAppointment}
          doctorId={user.id}
        />
      )}
    </div>
  );
}

interface DoctorAppointmentCardProps {
  appointment: AppointmentResponseDto;
  onCheckIn: (appointmentId: number) => void;
  onStartConsultation: (appointment: AppointmentResponseDto) => void;
  onCompleteConsultation: (appointment: AppointmentResponseDto) => void;
  doctorId: string;
}

function DoctorAppointmentCard({
  appointment,
  onCheckIn,
  onStartConsultation,
  onCompleteConsultation,
  doctorId,
}: DoctorAppointmentCardProps) {
  const canCheckIn =
    appointment.status === AppointmentStatus.PENDING ||
    appointment.status === AppointmentStatus.SCHEDULED;
  const canStartConsultation = appointment.status === AppointmentStatus.SCHEDULED;
  const canCompleteConsultation =
    appointment.status === AppointmentStatus.SCHEDULED && appointment.note; // Assuming if note exists, consultation started

  return (
    <div className="flex items-center justify-between rounded-lg border border-border p-4 hover:bg-muted/50 transition-colors">
      <div className="flex items-center space-x-4 flex-1">
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 flex-shrink-0">
          <Calendar className="h-6 w-6 text-primary" />
        </div>
        <div className="flex-1 space-y-1">
          <p className="font-medium">
            {format(new Date(appointment.appointmentDate), 'EEEE, MMMM d, yyyy')}
          </p>
          <div className="flex items-center space-x-4 text-sm text-muted-foreground">
            <span className="flex items-center">
              <Clock className="mr-1 h-4 w-4" />
              {appointment.time}
            </span>
            <span>•</span>
            <span>Patient: {appointment.patientId}</span>
            <span>•</span>
            <span>{appointment.type}</span>
          </div>
          <p className="text-xs">
            Status:{' '}
            <span
              className={`font-medium ${
                appointment.status === AppointmentStatus.SCHEDULED
                  ? 'text-green-600'
                  : appointment.status === AppointmentStatus.PENDING
                    ? 'text-yellow-600'
                    : appointment.status === AppointmentStatus.COMPLETED
                      ? 'text-blue-600'
                      : 'text-red-600'
              }`}
            >
              {appointment.status}
            </span>
          </p>
        </div>
      </div>
      <div className="flex items-center space-x-2 flex-shrink-0">
        {canCheckIn && (
          <Button variant="outline" size="sm" onClick={() => onCheckIn(appointment.id)}>
            <CheckCircle className="mr-2 h-4 w-4" />
            Check In
          </Button>
        )}
        {canStartConsultation && (
          <Button variant="outline" size="sm" onClick={() => onStartConsultation(appointment)}>
            <FileText className="mr-2 h-4 w-4" />
            Start Consultation
          </Button>
        )}
        {canCompleteConsultation && (
          <Button size="sm" onClick={() => onCompleteConsultation(appointment)}>
            Complete Consultation
          </Button>
        )}
      </div>
    </div>
  );
}

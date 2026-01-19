'use client';

/**
 * Nurse Pre/Post-op Page
 * 
 * View and manage pre-operative and post-operative care.
 * Record care notes, vitals, and treatment documentation.
 */

import { useEffect, useState } from 'react';
import { useAuth } from '../../../../hooks/patient/useAuth';
import { nurseApi } from '../../../../lib/api/nurse';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../../components/ui/card';
import { Button } from '../../../../components/ui/button';
import { Activity, FileText, Calendar, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { useSearchParams } from 'next/navigation';
import type { AppointmentResponseDto } from '../../../../application/dtos/AppointmentResponseDto';
import { format } from 'date-fns';
import { RecordVitalsDialog } from '../../../../components/nurse/RecordVitalsDialog';
import { AddCareNoteDialog } from '../../../../components/nurse/AddCareNoteDialog';
import type { PatientResponseDto } from '../../../../application/dtos/PatientResponseDto';

export default function NursePrePostOpPage() {
  const { user, isAuthenticated } = useAuth();
  const searchParams = useSearchParams();
  const [preOpPatients, setPreOpPatients] = useState<AppointmentResponseDto[]>([]);
  const [postOpPatients, setPostOpPatients] = useState<AppointmentResponseDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPatient, setSelectedPatient] = useState<PatientResponseDto | null>(null);
  const [selectedAppointment, setSelectedAppointment] = useState<AppointmentResponseDto | null>(null);
  const [showVitalsDialog, setShowVitalsDialog] = useState(false);
  const [showCareNoteDialog, setShowCareNoteDialog] = useState(false);
  const [careNoteType, setCareNoteType] = useState<'PRE_OP' | 'POST_OP' | 'GENERAL'>('GENERAL');

  useEffect(() => {
    if (isAuthenticated && user) {
      loadPrePostOpData();
    }
  }, [isAuthenticated, user]);

  useEffect(() => {
    // Handle URL parameters for direct navigation to patient
    const patientId = searchParams?.get('patient');
    const type = searchParams?.get('type');

    if (patientId && type && (type === 'pre-op' || type === 'post-op')) {
      // Load patient and open appropriate dialog
      handleLoadPatient(patientId, type as 'pre-op' | 'post-op');
    }
  }, [searchParams]);

  const loadPrePostOpData = async () => {
    try {
      setLoading(true);
      const [preOpResponse, postOpResponse] = await Promise.all([
        nurseApi.getPreOpPatients(),
        nurseApi.getPostOpPatients(),
      ]);

      if (preOpResponse.success && preOpResponse.data) {
        setPreOpPatients(preOpResponse.data);
      } else {
        toast.error(preOpResponse.error || 'Failed to load pre-op patients');
      }

      if (postOpResponse.success && postOpResponse.data) {
        setPostOpPatients(postOpResponse.data);
      } else {
        toast.error(postOpResponse.error || 'Failed to load post-op patients');
      }
    } catch (error) {
      toast.error('An error occurred while loading pre/post-op data');
      console.error('Error loading pre/post-op data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLoadPatient = async (patientId: string, type: 'pre-op' | 'post-op') => {
    try {
      const patientResponse = await nurseApi.getPatient(patientId);
      if (patientResponse.success && patientResponse.data) {
        setSelectedPatient(patientResponse.data);
        // Find appointment
        const appointments = type === 'pre-op' ? preOpPatients : postOpPatients;
        const appointment = appointments.find((apt) => apt.patientId === patientId);
        setSelectedAppointment(appointment || null);
        setCareNoteType(type === 'pre-op' ? 'PRE_OP' : 'POST_OP');
        setShowCareNoteDialog(true);
      }
    } catch (error) {
      toast.error('Failed to load patient');
      console.error('Error loading patient:', error);
    }
  };

  const handleRecordVitals = async (appointment: AppointmentResponseDto) => {
    const patientResponse = await nurseApi.getPatient(appointment.patientId);
    if (patientResponse.success && patientResponse.data) {
      setSelectedPatient(patientResponse.data);
      setSelectedAppointment(appointment);
      setShowVitalsDialog(true);
    }
  };

  const handleAddCareNote = async (appointment: AppointmentResponseDto, type: 'PRE_OP' | 'POST_OP') => {
    const patientResponse = await nurseApi.getPatient(appointment.patientId);
    if (patientResponse.success && patientResponse.data) {
      setSelectedPatient(patientResponse.data);
      setSelectedAppointment(appointment);
      setCareNoteType(type);
      setShowCareNoteDialog(true);
    }
  };

  const handleSuccess = () => {
    setShowVitalsDialog(false);
    setShowCareNoteDialog(false);
    setSelectedPatient(null);
    setSelectedAppointment(null);
    loadPrePostOpData();
  };

  if (!isAuthenticated || !user) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-muted-foreground">Please log in to view pre/post-op care</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Pre/Post-op Care</h1>
        <p className="mt-2 text-muted-foreground">Manage pre-operative and post-operative patient care</p>
      </div>

      {/* Pre-op Patients */}
      <Card>
        <CardHeader>
          <CardTitle>Pre-operative Patients</CardTitle>
          <CardDescription>Patients requiring pre-operative care</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-4 text-sm text-muted-foreground">Loading pre-op patients...</p>
            </div>
          ) : preOpPatients.length === 0 ? (
            <div className="text-center py-8">
              <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-sm text-muted-foreground">No pre-op patients at this time</p>
            </div>
          ) : (
            <div className="space-y-4">
              {preOpPatients.map((appointment) => (
                <div
                  key={appointment.id}
                  className="flex items-center justify-between rounded-lg border border-border p-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center space-x-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-warning/10">
                      <Activity className="h-6 w-6 text-warning" />
                    </div>
                    <div className="space-y-1">
                      <p className="font-medium">Patient: {appointment.patientId}</p>
                      <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                        <span className="flex items-center">
                          <Calendar className="mr-1 h-4 w-4" />
                          {format(new Date(appointment.appointmentDate), 'MMMM d, yyyy')}
                        </span>
                        <span>•</span>
                        <span className="flex items-center">
                          <Clock className="mr-1 h-4 w-4" />
                          {appointment.time}
                        </span>
                        <span>•</span>
                        <span>{appointment.type}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRecordVitals(appointment)}
                    >
                      Record Vitals
                    </Button>
                    <Button size="sm" onClick={() => handleAddCareNote(appointment, 'PRE_OP')}>
                      Add Pre-op Note
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Post-op Patients */}
      <Card>
        <CardHeader>
          <CardTitle>Post-operative Patients</CardTitle>
          <CardDescription>Patients requiring post-operative care</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-4 text-sm text-muted-foreground">Loading post-op patients...</p>
            </div>
          ) : postOpPatients.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-sm text-muted-foreground">No post-op patients at this time</p>
            </div>
          ) : (
            <div className="space-y-4">
              {postOpPatients.map((appointment) => (
                <div
                  key={appointment.id}
                  className="flex items-center justify-between rounded-lg border border-border p-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center space-x-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-success/10">
                      <FileText className="h-6 w-6 text-success" />
                    </div>
                    <div className="space-y-1">
                      <p className="font-medium">Patient: {appointment.patientId}</p>
                      <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                        <span className="flex items-center">
                          <Calendar className="mr-1 h-4 w-4" />
                          {format(new Date(appointment.appointmentDate), 'MMMM d, yyyy')}
                        </span>
                        <span>•</span>
                        <span className="flex items-center">
                          <Clock className="mr-1 h-4 w-4" />
                          {appointment.time}
                        </span>
                        <span>•</span>
                        <span>{appointment.type}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRecordVitals(appointment)}
                    >
                      Record Vitals
                    </Button>
                    <Button size="sm" onClick={() => handleAddCareNote(appointment, 'POST_OP')}>
                      Add Post-op Note
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Record Vitals Dialog */}
      {showVitalsDialog && selectedPatient && (
        <RecordVitalsDialog
          open={showVitalsDialog}
          onClose={() => {
            setShowVitalsDialog(false);
            setSelectedPatient(null);
            setSelectedAppointment(null);
          }}
          onSuccess={handleSuccess}
          patient={selectedPatient}
          appointment={selectedAppointment}
          nurseId={user.id}
        />
      )}

      {/* Add Care Note Dialog */}
      {showCareNoteDialog && selectedPatient && (
        <AddCareNoteDialog
          open={showCareNoteDialog}
          onClose={() => {
            setShowCareNoteDialog(false);
            setSelectedPatient(null);
            setSelectedAppointment(null);
          }}
          onSuccess={handleSuccess}
          patient={selectedPatient}
          appointment={selectedAppointment}
          nurseId={user.id}
          defaultNoteType={careNoteType}
        />
      )}
    </div>
  );
}

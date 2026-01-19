'use client';

/**
 * Nurse Patients Page
 * 
 * View all patients assigned to nurse for care.
 * Allows recording vitals, adding care notes, and updating patient status.
 */

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/patient/useAuth';
import { nurseApi } from '@/lib/api/nurse';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Users, Search, Activity, FileText, Plus } from 'lucide-react';
import { toast } from 'sonner';
import type { PatientResponseDto } from '@/application/dtos/PatientResponseDto';
import type { AppointmentResponseDto } from '@/application/dtos/AppointmentResponseDto';
import { RecordVitalsDialog } from '@/components/nurse/RecordVitalsDialog';
import { AddCareNoteDialog } from '@/components/nurse/AddCareNoteDialog';
import { PatientCard } from '@/components/nurse/PatientCard';

export default function NursePatientsPage() {
  const { user, isAuthenticated } = useAuth();
  const [patients, setPatients] = useState<PatientResponseDto[]>([]);
  const [appointments, setAppointments] = useState<AppointmentResponseDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<PatientResponseDto | null>(null);
  const [selectedAppointment, setSelectedAppointment] = useState<AppointmentResponseDto | null>(null);
  const [showVitalsDialog, setShowVitalsDialog] = useState(false);
  const [showCareNoteDialog, setShowCareNoteDialog] = useState(false);

  useEffect(() => {
    if (isAuthenticated && user) {
      loadPatients();
    }
  }, [isAuthenticated, user]);

  const loadPatients = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      // Get checked-in patients for today
      const appointmentsResponse = await nurseApi.getTodayCheckedInPatients();

      if (appointmentsResponse.success && appointmentsResponse.data) {
        setAppointments(appointmentsResponse.data);
        
        // Extract unique patient IDs and fetch patient details
        const patientIds = Array.from(
          new Set(appointmentsResponse.data.map((apt) => apt.patientId)),
        );

        const patientPromises = patientIds.map((patientId) =>
          nurseApi.getPatient(patientId).catch(() => null),
        );

        const patientResponses = await Promise.all(patientPromises);
        const validPatients = patientResponses
          .filter((response): response is { success: true; data: PatientResponseDto } =>
            response !== null && response.success === true && response.data !== null,
          )
          .map((response) => response.data);

        setPatients(validPatients);
      } else if (!appointmentsResponse.success) {
        toast.error(appointmentsResponse.error || 'Failed to load patients');
      } else {
        toast.error('Failed to load patients');
      }
    } catch (error) {
      toast.error('An error occurred while loading patients');
      console.error('Error loading patients:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRecordVitals = (patient: PatientResponseDto) => {
    setSelectedPatient(patient);
    // Find appointment for this patient
    const appointment = appointments.find((apt) => apt.patientId === patient.id);
    setSelectedAppointment(appointment || null);
    setShowVitalsDialog(true);
  };

  const handleAddCareNote = (patient: PatientResponseDto) => {
    setSelectedPatient(patient);
    const appointment = appointments.find((apt) => apt.patientId === patient.id);
    setSelectedAppointment(appointment || null);
    setShowCareNoteDialog(true);
  };

  const handleSuccess = () => {
    setShowVitalsDialog(false);
    setShowCareNoteDialog(false);
    setSelectedPatient(null);
    setSelectedAppointment(null);
    loadPatients();
  };

  const filteredPatients = patients.filter((patient) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      patient.firstName?.toLowerCase().includes(query) ||
      patient.lastName?.toLowerCase().includes(query) ||
      patient.email?.toLowerCase().includes(query) ||
      patient.phone?.toLowerCase().includes(query)
    );
  });

  if (!isAuthenticated || !user) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-muted-foreground">Please log in to view patients</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Patients Under Care</h1>
          <p className="mt-2 text-muted-foreground">Manage patient care and record vitals</p>
        </div>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search patients by name, email, or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Patients List */}
      <Card>
        <CardHeader>
          <CardTitle>Today's Patients</CardTitle>
          <CardDescription>Patients checked in today requiring care</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-4 text-sm text-muted-foreground">Loading patients...</p>
            </div>
          ) : filteredPatients.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-sm text-muted-foreground">
                {searchQuery ? 'No patients match your search' : 'No patients checked in today'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredPatients.map((patient) => {
                const appointment = appointments.find((apt) => apt.patientId === patient.id);
                return (
                  <PatientCard
                    key={patient.id}
                    patient={patient}
                    appointment={appointment}
                    onRecordVitals={handleRecordVitals}
                    onAddCareNote={handleAddCareNote}
                  />
                );
              })}
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
        />
      )}
    </div>
  );
}

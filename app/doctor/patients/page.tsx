'use client';

/**
 * Doctor Patients Page
 * 
 * View all patients and their information in a clean table format.
 * Optimized for large screens with responsive mobile fallback.
 * 
 * REFACTORED: Uses PatientTable component for consistent UI across roles.
 * REASON: Eliminates duplicate code, provides table view for large screens,
 * and ensures consistent patient data display.
 */

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/patient/useAuth';
import { doctorApi } from '@/lib/api/doctor';
import { PatientTable } from '@/components/patient/PatientTable';
import { toast } from 'sonner';
import type { PatientResponseDto } from '@/application/dtos/PatientResponseDto';
import type { AppointmentResponseDto } from '@/application/dtos/AppointmentResponseDto';

export default function DoctorPatientsPage() {
  const { user, isAuthenticated } = useAuth();
  const [patients, setPatients] = useState<PatientResponseDto[]>([]);
  const [appointments, setAppointments] = useState<AppointmentResponseDto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isAuthenticated && user) {
      loadPatients();
    }
  }, [isAuthenticated, user]);

  const loadPatients = async () => {
    if (!user) return;

    try {
      setLoading(true);
      // Get appointments to extract unique patient IDs
      // Include all appointments (not just consultation requests) to show all patients
      const appointmentsResponse = await doctorApi.getAppointments(user.id, undefined, true);

      if (appointmentsResponse.success && appointmentsResponse.data) {
        // Store appointments for table display
        setAppointments(appointmentsResponse.data);

        // Extract unique patient IDs
        const patientIds = Array.from(
          new Set(appointmentsResponse.data.map((apt) => apt.patientId)),
        );

        // Fetch patient details for each unique patient
        const patientPromises = patientIds.map((patientId) =>
          doctorApi.getPatient(patientId).catch(() => null),
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
      <div>
        <h1 className="text-3xl font-bold text-foreground">Patients</h1>
        <p className="mt-2 text-muted-foreground">
          View and manage patient information. Shows all patients you have had appointments with (past and upcoming).
        </p>
      </div>

      {/* Patient Table */}
      <PatientTable
        patients={patients}
        appointments={appointments}
        loading={loading}
        role="doctor"
        showActions={true}
      />
    </div>
  );
}

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

import { useAuth } from '@/hooks/patient/useAuth';
import { PatientTable } from '@/components/patient/PatientTable';
import { useDoctorPatients } from '@/hooks/doctor/useDoctorPatients';
import { useDoctorAppointments } from '@/hooks/doctor/useDoctorAppointments';

export default function DoctorPatientsPage() {
  const { user, isAuthenticated } = useAuth();

  // OPTIMIZED: Use dedicated hooks for data fetching
  // 1. Fetch unique patients directly (avoids N+1 query problem)
  const {
    data: patients = [],
    isLoading: isLoadingPatients,
    error: patientsError
  } = useDoctorPatients(!!user);

  // 2. Fetch appointments for history/stats (single query)
  const {
    data: appointments = [],
    isLoading: isLoadingAppointments
  } = useDoctorAppointments(user?.id, !!user);

  const loading = isLoadingPatients || isLoadingAppointments;

  if (!isAuthenticated || !user) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-muted-foreground">Please log in to view patients</p>
        </div>
      </div>
    );
  }

  if (patientsError) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center text-red-500">
          <p>Failed to load patients. Please try refreshing the page.</p>
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

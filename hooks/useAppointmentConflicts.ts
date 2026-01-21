/**
 * Hook: useAppointmentConflicts
 * 
 * React hook for detecting appointment conflicts for a patient.
 * Checks if patient has overlapping appointments before booking.
 */

import { useState, useEffect } from 'react';
import { patientApi } from '@/lib/api/patient';
import type { AppointmentResponseDto } from '@/application/dtos/AppointmentResponseDto';
import { AppointmentStatus } from '@/domain/enums/AppointmentStatus';

interface ConflictCheck {
  doctorId: string;
  date: Date;
  time: string; // HH:mm format
}

interface AppointmentConflict {
  appointment: AppointmentResponseDto;
  reason: string;
}

interface UseAppointmentConflictsReturn {
  conflicts: AppointmentConflict[];
  loading: boolean;
  error: string | null;
  checkConflicts: (check: ConflictCheck) => Promise<void>;
}

/**
 * Check for appointment conflicts for a patient
 */
export function useAppointmentConflicts(
  patientId: string | null,
  enabled = true
): UseAppointmentConflictsReturn {
  const [conflicts, setConflicts] = useState<AppointmentConflict[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentCheck, setCurrentCheck] = useState<ConflictCheck | null>(null);

  const checkConflicts = async (check: ConflictCheck) => {
    if (!patientId || !enabled) {
      setConflicts([]);
      return;
    }

    setCurrentCheck(check);
    setLoading(true);
    setError(null);

    try {
      // Get all patient appointments
      const response = await patientApi.getAppointments(patientId);

      if (response.success && response.data) {
        const foundConflicts: AppointmentConflict[] = [];

        // Check for conflicts
        response.data.forEach((apt) => {
          // Skip cancelled and completed appointments
          if (apt.status === AppointmentStatus.CANCELLED || apt.status === AppointmentStatus.COMPLETED) {
            return;
          }

          const aptDate = new Date(apt.appointmentDate);
          const checkDate = new Date(check.date);

          // Check if same date
          if (
            aptDate.getFullYear() === checkDate.getFullYear() &&
            aptDate.getMonth() === checkDate.getMonth() &&
            aptDate.getDate() === checkDate.getDate()
          ) {
            // Check if same time (convert both to comparable format)
            const aptTime = apt.time; // e.g., "10:00 AM"
            const checkTime = check.time; // e.g., "10:00"

            // Convert checkTime (HH:mm) to 12-hour format for comparison
            const [checkHours, checkMinutes] = checkTime.split(':');
            let checkHour = parseInt(checkHours, 10);
            const checkMin = parseInt(checkMinutes, 10);
            const checkPeriod = checkHour >= 12 ? 'PM' : 'AM';
            if (checkHour > 12) checkHour -= 12;
            if (checkHour === 0) checkHour = 12;
            const checkTimeFormatted = `${checkHour}:${checkMin.toString().padStart(2, '0')} ${checkPeriod}`;

            // Check if times match (allowing for slight variations)
            if (aptTime === checkTimeFormatted || aptTime.startsWith(checkTime.split(':')[0])) {
              foundConflicts.push({
                appointment: apt,
                reason: `You already have an appointment on ${aptDate.toLocaleDateString()} at ${aptTime}`,
              });
            }
          }
        });

        setConflicts(foundConflicts);
      } else if (!response.success) {
        setError(response.error || 'Failed to check for conflicts');
        setConflicts([]);
      } else {
        setError('Failed to check for conflicts');
        setConflicts([]);
      }
    } catch (err) {
      console.error('Error checking appointment conflicts:', err);
      setError('An error occurred while checking for conflicts');
      setConflicts([]);
    } finally {
      setLoading(false);
    }
  };

  // Auto-check when currentCheck changes
  useEffect(() => {
    if (currentCheck && patientId && enabled) {
      checkConflicts(currentCheck);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentCheck?.doctorId, currentCheck?.date?.toISOString(), currentCheck?.time, patientId, enabled]);

  return {
    conflicts,
    loading,
    error,
    checkConflicts,
  };
}

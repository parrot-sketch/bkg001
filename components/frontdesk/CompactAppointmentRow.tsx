'use client';

/**
 * Compact Appointment Row - For Dashboard Schedule
 * 
 * Minimal, scannable appointment display optimized for dashboards.
 * Shows only: Time, Patient, Doctor, Status (color-coded)
 * No clutter - designed for quick scanning and action.
 */

import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Clock, User, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import type { AppointmentResponseDto } from '@/application/dtos/AppointmentResponseDto';
import { AppointmentStatus } from '@/domain/enums/AppointmentStatus';
import { patientApi } from '@/lib/api/patient';

interface CompactAppointmentRowProps {
  appointment: AppointmentResponseDto;
  doctorName?: string;
}

export function CompactAppointmentRow({ appointment, doctorName }: CompactAppointmentRowProps) {
  const [patientName, setPatientName] = useState<string>('');
  const [loadingPatient, setLoadingPatient] = useState(false);

  // Load patient name if not available in appointment object
  useEffect(() => {
    if (appointment.patient?.firstName) {
      // Patient info already available
      setPatientName(`${appointment.patient.firstName}${appointment.patient.lastName ? ' ' + appointment.patient.lastName : ''}`);
    } else if (appointment.patientId) {
      // Need to fetch patient info
      loadPatientName();
    }
  }, [appointment.patientId, appointment.patient]);

  const loadPatientName = async () => {
    if (!appointment.patientId) return;
    
    try {
      setLoadingPatient(true);
      const response = await patientApi.getPatient(appointment.patientId);
      if (response.success && response.data) {
        const name = `${response.data.firstName}${response.data.lastName ? ' ' + response.data.lastName : ''}`;
        setPatientName(name);
      } else {
        setPatientName('Patient');
      }
    } catch (error) {
      console.error('Error loading patient info:', error);
      setPatientName('Patient');
    } finally {
      setLoadingPatient(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case AppointmentStatus.SCHEDULED:
        return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      case AppointmentStatus.PENDING:
        return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
      case AppointmentStatus.COMPLETED:
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      case AppointmentStatus.CANCELLED:
        return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400';
    }
  };

  const getStatusDot = (status: string) => {
    switch (status) {
      case AppointmentStatus.SCHEDULED:
        return 'bg-green-500';
      case AppointmentStatus.PENDING:
        return 'bg-amber-500';
      case AppointmentStatus.COMPLETED:
        return 'bg-blue-500';
      case AppointmentStatus.CANCELLED:
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <div className="flex items-center justify-between p-3 rounded-lg border border-border/50 hover:bg-muted/50 hover:border-border transition-colors group cursor-pointer">
      {/* Time & Status Indicator */}
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className="flex flex-col items-center gap-1 flex-shrink-0">
          <div className={`w-2 h-2 rounded-full ${getStatusDot(appointment.status)}`} />
          <Clock className="h-4 w-4 text-muted-foreground" />
        </div>

        {/* Time */}
        <div className="flex-shrink-0">
          <span className="text-sm font-semibold text-foreground">{appointment.time}</span>
        </div>

        {/* Separator */}
        <span className="text-muted-foreground text-xs">•</span>

        {/* Patient & Doctor (Compact) */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-sm font-medium text-foreground truncate">
              {loadingPatient ? (
                <span className="text-xs text-muted-foreground">Loading...</span>
              ) : (
                patientName || 'Patient'
              )}
            </span>
            {doctorName && (
              <>
                <span className="text-muted-foreground text-xs hidden sm:inline">→</span>
                <span className="text-xs text-muted-foreground truncate hidden sm:inline">{doctorName}</span>
              </>
            )}
          </div>
          {appointment.type && (
            <p className="text-xs text-muted-foreground truncate">{appointment.type}</p>
          )}
        </div>
      </div>

      {/* Status Badge */}
      <div className="flex items-center gap-2 flex-shrink-0 ml-2">
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${getStatusColor(appointment.status)}`}>
          {appointment.status}
        </span>
        <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    </div>
  );
}

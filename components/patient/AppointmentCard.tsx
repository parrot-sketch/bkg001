'use client';

/**
 * Appointment Card Component
 * 
 * Displays appointment information including doctor details.
 * Shows date, time, type, status, and doctor name with optional profile image.
 */

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, User, MapPin } from 'lucide-react';
import { format } from 'date-fns';
import type { AppointmentResponseDto } from '@/application/dtos/AppointmentResponseDto';
import type { DoctorResponseDto } from '@/application/dtos/DoctorResponseDto';
import { AppointmentStatus } from '@/domain/enums/AppointmentStatus';
import { doctorApi } from '@/lib/api/doctor';
import Link from 'next/link';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

interface AppointmentCardProps {
  appointment: AppointmentResponseDto;
  showDoctorInfo?: boolean;
}

export function AppointmentCard({ appointment, showDoctorInfo = true }: AppointmentCardProps) {
  const [doctor, setDoctor] = useState<DoctorResponseDto | null>(null);
  const [loadingDoctor, setLoadingDoctor] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (showDoctorInfo && appointment.doctorId) {
      loadDoctorInfo();
    }
  }, [appointment.doctorId, showDoctorInfo]);

  const loadDoctorInfo = async () => {
    if (!appointment.doctorId) {
      return;
    }
    
    setLoadingDoctor(true);
    try {
      const response = await doctorApi.getDoctor(appointment.doctorId);
      if (response.success && response.data) {
        setDoctor(response.data);
      } else if (!response.success) {
        console.warn('Failed to load doctor info:', response.error || 'Unknown error');
      } else {
        console.warn('Failed to load doctor info: Unknown error');
      }
    } catch (error) {
      console.error('Error loading doctor info:', error);
      // Don't show toast for missing doctor info to avoid noise
    } finally {
      setLoadingDoctor(false);
    }
  };

  const handleViewDoctorProfile = () => {
    if (doctor?.id) {
      router.push(`/portal/doctors/${doctor.id}`);
    }
  };

  const statusColorClass =
    appointment.status === AppointmentStatus.SCHEDULED
      ? 'text-dark-cyan-500' // #0a9396 - dark cyan for scheduled
      : appointment.status === AppointmentStatus.PENDING
        ? 'text-golden-orange-500' // #ee9b00 - golden orange for pending
        : appointment.status === AppointmentStatus.COMPLETED
          ? 'text-dark-teal-500' // #005f73 - dark teal for completed
          : 'text-brown-red-500'; // #9b2226 - brown red for cancelled

  return (
    <>
      <div className="flex items-start space-x-3 sm:space-x-4 flex-1 min-w-0">
        <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-lg bg-primary/10 flex-shrink-0">
          <Calendar className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
        </div>
        <div className="flex-1 space-y-1.5 sm:space-y-2 min-w-0">
          <div>
            <p className="font-medium text-slate-900 text-sm sm:text-base">
              {format(new Date(appointment.appointmentDate), 'EEEE, MMMM d, yyyy')}
            </p>
            <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm text-gray-700 mt-1">
              <span className="flex items-center">
                <Clock className="mr-1 h-3 w-3 sm:h-4 sm:w-4" />
                {appointment.time}
              </span>
              <span className="hidden sm:inline">•</span>
              <span className="truncate">{appointment.type}</span>
            </div>
          </div>

            {/* Doctor Information */}
            {showDoctorInfo && appointment.doctorId && (
              <div className="flex items-center space-x-2 pt-2 border-t border-border/50">
                {loadingDoctor ? (
                  <div className="flex items-center space-x-2 text-xs sm:text-sm text-gray-600">
                    <div className="animate-spin rounded-full h-3 w-3 border-b border-primary"></div>
                    <span>Loading doctor information...</span>
                  </div>
                ) : doctor ? (
                  <div className="flex items-center space-x-2 min-w-0">
                    {doctor.profileImage ? (
                      <Link href={`/portal/doctors/${doctor.id}`} className="flex-shrink-0">
                        <img
                          src={doctor.profileImage}
                          alt={doctor.name}
                          className="w-7 h-7 sm:w-8 sm:h-8 rounded-full object-cover border border-accent/30 cursor-pointer hover:border-accent transition-colors"
                        />
                      </Link>
                    ) : (
                      <Link href={`/portal/doctors/${doctor.id}`} className="flex-shrink-0">
                        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-primary flex items-center justify-center border border-accent/30 cursor-pointer hover:border-accent transition-colors">
                          <User className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary-foreground" />
                        </div>
                      </Link>
                    )}
                    <div className="flex-1 min-w-0">
                      <Link
                        href={`/portal/doctors/${doctor.id}`}
                        className="text-xs sm:text-sm font-medium text-primary hover:underline text-left block truncate"
                      >
                        {doctor.title} {doctor.firstName} {doctor.lastName}
                      </Link>
                      {doctor.clinicLocation && (
                        <div className="flex items-center text-xs text-gray-600 mt-0.5">
                          <MapPin className="h-3 w-3 mr-1 flex-shrink-0" />
                          <span className="truncate">{doctor.clinicLocation}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-gray-500 italic">
                    Doctor information unavailable
                  </div>
                )}
              </div>
            )}

            {/* Status */}
            <p className="text-xs text-gray-700">
              Status:{' '}
              <span className={`font-medium ${statusColorClass}`}>{appointment.status}</span>
            </p>
            {appointment.reason && (
              <p className="text-xs text-gray-600 line-clamp-2">{appointment.reason}</p>
            )}
          </div>
      </div>
    </>
  );
}

'use client';

/**
 * Nurse Patient Card Component
 * 
 * Displays patient information with assigned doctor details.
 * Shows patient name, contact info, appointment details, and assigned doctor.
 */

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Users, User, MapPin, Activity, FileText } from 'lucide-react';
import type { PatientResponseDto } from '@/application/dtos/PatientResponseDto';
import type { AppointmentResponseDto } from '@/application/dtos/AppointmentResponseDto';
import type { DoctorResponseDto } from '@/application/dtos/DoctorResponseDto';
import { doctorApi } from '@/lib/api/doctor';
import { DoctorProfileModal } from '@/components/patient/DoctorProfileModal';

interface PatientCardProps {
  patient: PatientResponseDto;
  appointment?: AppointmentResponseDto | null;
  onRecordVitals: (patient: PatientResponseDto) => void;
  onAddCareNote: (patient: PatientResponseDto) => void;
}

export function PatientCard({
  patient,
  appointment,
  onRecordVitals,
  onAddCareNote,
}: PatientCardProps) {
  const [doctor, setDoctor] = useState<DoctorResponseDto | null>(null);
  const [loadingDoctor, setLoadingDoctor] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);

  useEffect(() => {
    if (appointment?.doctorId) {
      loadDoctorInfo();
    }
  }, [appointment?.doctorId]);

  const loadDoctorInfo = async () => {
    if (!appointment?.doctorId) return;
    setLoadingDoctor(true);
    try {
      const response = await doctorApi.getDoctor(appointment.doctorId);
      if (response.success && response.data) {
        setDoctor(response.data);
      }
    } catch (error) {
      console.error('Error loading doctor info:', error);
    } finally {
      setLoadingDoctor(false);
    }
  };

  const handleViewDoctorProfile = () => {
    if (doctor) {
      setShowProfileModal(true);
    }
  };

  return (
    <>
      <div className="flex items-center justify-between rounded-lg border border-border p-4 hover:bg-muted/50 transition-colors">
        <div className="flex items-center space-x-4 flex-1">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 flex-shrink-0">
            <Users className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1 space-y-2">
            <div>
              <p className="font-medium text-foreground">
                {patient.firstName} {patient.lastName}
              </p>
              <div className="flex items-center space-x-4 text-sm text-muted-foreground mt-1">
                <span>{patient.email}</span>
                {patient.phone && (
                  <>
                    <span>•</span>
                    <span>{patient.phone}</span>
                  </>
                )}
              </div>
            </div>

            {/* Appointment Info */}
            {appointment && (
              <div className="text-sm text-muted-foreground">
                <p>
                  Appointment: {appointment.type} • {appointment.time}
                </p>
              </div>
            )}

            {/* Assigned Doctor Info */}
            {appointment?.doctorId && (
              <div className="flex items-center space-x-2 pt-2 border-t border-border/50">
                {loadingDoctor ? (
                  <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                    <div className="animate-spin rounded-full h-3 w-3 border-b border-primary"></div>
                    <span>Loading doctor...</span>
                  </div>
                ) : doctor ? (
                  <div className="flex items-center space-x-2">
                    {doctor.profileImage ? (
                      <img
                        src={doctor.profileImage}
                        alt={doctor.name}
                        className="w-8 h-8 rounded-full object-cover border border-accent/30 cursor-pointer hover:border-accent transition-colors"
                        onClick={handleViewDoctorProfile}
                      />
                    ) : (
                      <div
                        className="w-8 h-8 rounded-full bg-primary flex items-center justify-center border border-accent/30 cursor-pointer hover:border-accent transition-colors"
                        onClick={handleViewDoctorProfile}
                      >
                        <User className="h-4 w-4 text-primary-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <button
                        onClick={handleViewDoctorProfile}
                        className="text-sm font-medium text-primary hover:underline text-left"
                      >
                        {doctor.title} {doctor.firstName} {doctor.lastName}
                      </button>
                      {doctor.clinicLocation && (
                        <div className="flex items-center text-xs text-muted-foreground mt-0.5">
                          <MapPin className="h-3 w-3 mr-1" />
                          <span className="truncate">{doctor.clinicLocation}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-muted-foreground">
                    Doctor ID: {appointment.doctorId}
                  </div>
                )}
              </div>
            )}

            {/* Patient Age */}
            {patient.dateOfBirth && (
              <p className="text-xs text-muted-foreground">
                Age: {patient.age} years {patient.age < 18 ? '(Minor)' : ''}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center space-x-2 flex-shrink-0">
          <Button variant="outline" size="sm" onClick={() => onRecordVitals(patient)}>
            <Activity className="mr-2 h-4 w-4" />
            Record Vitals
          </Button>
          <Button variant="outline" size="sm" onClick={() => onAddCareNote(patient)}>
            <FileText className="mr-2 h-4 w-4" />
            Add Note
          </Button>
        </div>
      </div>

      {/* Doctor Profile Modal */}
      {doctor && (
        <DoctorProfileModal
          open={showProfileModal}
          onClose={() => setShowProfileModal(false)}
          doctor={doctor}
        />
      )}
    </>
  );
}

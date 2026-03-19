'use client';

import { useState, useEffect } from 'react';
import { Loader2, CheckCircle2, MapPin, CheckCircle } from 'lucide-react';
import { ProfileImage } from '@/components/profile-image';
import { doctorApi } from '@/lib/api/doctor';
import { patientApi } from '@/lib/api/patient';
import { DoctorResponseDto } from '@/application/dtos/DoctorResponseDto';
import { cn } from '@/lib/utils';

interface DoctorSelectionStepProps {
  selectedDoctorId: string;
  onSelect: (id: string) => void;
  selectedDoctor: DoctorResponseDto | null;
  onDoctorLoaded: (doctor: DoctorResponseDto) => void;
  lockDoctor?: boolean;
}

export function DoctorSelectionStep({
  selectedDoctorId,
  onSelect,
  selectedDoctor,
  onDoctorLoaded,
  lockDoctor = false
}: DoctorSelectionStepProps) {
  const [doctors, setDoctors] = useState<DoctorResponseDto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDoctors();
  }, []);

  const loadDoctors = async () => {
    setLoading(true);
    try {
      const response = await patientApi.getAllDoctors();
      if (response.success && response.data) {
        setDoctors(response.data);
      }
    } catch (error) {
      console.error('Failed to load doctors', error);
    } finally {
      setLoading(false);
    }
  };

  if (lockDoctor && selectedDoctor) {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl border-2 border-cyan-500/20 bg-cyan-50/50 p-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold uppercase tracking-widest text-cyan-600">Selected Doctor</span>
            <CheckCircle className="h-5 w-5 text-cyan-600" />
          </div>
          <div className="flex items-center gap-4">
            <ProfileImage
              url={selectedDoctor.profileImage}
              name={selectedDoctor.name || `${selectedDoctor.firstName} ${selectedDoctor.lastName}`}
              className="h-16 w-16 rounded-full border-2 border-white shadow"
            />
            <div>
              <h4 className="text-lg font-bold text-slate-900">
                {selectedDoctor.title} {selectedDoctor.name || `${selectedDoctor.firstName} ${selectedDoctor.lastName}`}
              </h4>
              <p className="text-sm text-slate-500 font-medium">{selectedDoctor.specialization}</p>
              {selectedDoctor.clinicLocation && (
                <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                  <MapPin className="h-3 w-3" /> {selectedDoctor.clinicLocation}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-500/40" />
        <p className="text-sm font-medium text-slate-400">Loading doctors...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-slate-900 mb-1">Select Doctor</h3>
        <p className="text-sm text-slate-500">Choose a medical professional for this appointment</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[400px] overflow-y-auto pr-2">
        {doctors.map((doctor) => {
          const isSelected = selectedDoctorId === doctor.id;
          const doctorName = doctor.name || `${doctor.firstName} ${doctor.lastName}`;
          const displayName = doctor.title && !doctorName.toLowerCase().startsWith(doctor.title.toLowerCase())
            ? `${doctor.title} ${doctorName}`
            : doctorName;

          return (
            <button
              key={doctor.id}
              onClick={() => onSelect(doctor.id)}
              className={cn(
                "flex items-center gap-3 p-4 rounded-xl border-2 text-left transition-all",
                isSelected
                  ? "border-cyan-500 bg-cyan-50 ring-1 ring-cyan-500/20"
                  : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
              )}
            >
              <ProfileImage
                url={doctor.profileImage}
                name={doctorName}
                className={cn(
                  "h-12 w-12 rounded-full border-2 transition-transform",
                  isSelected ? "border-cyan-200" : "border-white shadow"
                )}
              />
              <div className="flex-1 min-w-0">
                <p className={cn("font-semibold truncate", isSelected ? "text-slate-900" : "text-slate-800")}>
                  {displayName}
                </p>
                <p className="text-xs text-slate-500 truncate">{doctor.specialization || 'Medical Specialist'}</p>
              </div>
              {isSelected && <CheckCircle2 className="h-5 w-5 text-cyan-600 shrink-0" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

'use client';

import { CheckCircle2, Clock, X } from 'lucide-react';
import { ProfileImage } from '@/components/profile-image';
import { PatientCombobox } from '@/components/frontdesk/PatientCombobox';
import { PatientResponseDto } from '@/application/dtos/PatientResponseDto';
import { Button } from '@/components/ui/button';

interface PatientSelectionStepProps {
  selectedPatientId: string;
  onSelect: (id: string, patient: PatientResponseDto | null) => void;
  selectedPatient: PatientResponseDto | null;
  onPatientCleared: () => void;
}

export function PatientSelectionStep({
  selectedPatientId,
  onSelect,
  selectedPatient,
  onPatientCleared
}: PatientSelectionStepProps) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-slate-900 mb-1">Select Patient</h3>
        <p className="text-sm text-slate-500">Search and select the patient for this appointment</p>
      </div>

      <PatientCombobox
        value={selectedPatientId}
        onSelect={(id, patient) => onSelect(id, patient || null)}
      />

      {selectedPatient && (
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-start gap-4">
            <ProfileImage
              url={selectedPatient.profileImage}
              name={`${selectedPatient.firstName} ${selectedPatient.lastName}`}
              bgColor={selectedPatient.colorCode}
              className="h-14 w-14 rounded-full border-2 border-white shadow"
            />
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-slate-900">
                  {selectedPatient.firstName} {selectedPatient.lastName}
                </h4>
                {selectedPatient.fileNumber && (
                  <span className="text-xs px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-mono">
                    {selectedPatient.fileNumber}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {selectedPatient.age} yrs · {selectedPatient.gender}
                </span>
                {selectedPatient.phone && (
                  <span>{selectedPatient.phone}</span>
                )}
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onPatientCleared}
              className="shrink-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

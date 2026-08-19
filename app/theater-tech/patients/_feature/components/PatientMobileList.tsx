import { User } from 'lucide-react';
import { ProfileImage } from '@/components/profile-image';
import type { PatientRegistryDto } from '../types/patient-page';
import { formatPatientAge, formatPatientName } from '../utils/formatters';

interface PatientMobileCardProps {
  patient: PatientRegistryDto;
  onSelect: (patientId: string) => void;
}

function PatientMobileCard({ patient, onSelect }: PatientMobileCardProps) {
  const name = formatPatientName(patient.firstName, patient.lastName);
  const age = formatPatientAge(patient.dateOfBirth);

  return (
    <div
      className="p-4 flex flex-col gap-2 cursor-pointer active:bg-[#e7d6bf]/10"
      onClick={() => onSelect(patient.id)}
    >
      <div className="flex items-center gap-3">
        <ProfileImage
          url={patient.profileImage}
          name={name}
          bgColor={patient.colorCode}
          className="h-10 w-10"
          textClassName="text-white text-sm font-semibold"
        />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-900 truncate">{name}</p>
          <div className="flex flex-wrap gap-x-3 gap-y-1 mt-0.5 text-xs text-slate-500">
            <span className="font-mono">{patient.fileNumber || '—'}</span>
            <span>{age || '—'}</span>
            <span className="capitalize">{patient.gender?.toLowerCase() || '—'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

interface PatientMobileListProps {
  patients: ReadonlyArray<PatientRegistryDto>;
  onSelectPatient: (patientId: string) => void;
}

export function PatientMobileList({ patients, onSelectPatient }: PatientMobileListProps) {
  return (
    <div className="md:hidden divide-y divide-[#e7d6bf]/60 max-h-[60vh] overflow-y-auto">
      {patients.map((patient) => (
        <PatientMobileCard key={patient.id} patient={patient} onSelect={onSelectPatient} />
      ))}
    </div>
  );
}

import { PatientMobileCard } from './PatientMobileCard';
import type { PatientRegistryDto } from '../types/patient-page';

interface PatientMobileListProps {
  patients: ReadonlyArray<PatientRegistryDto>;
  onSelectPatient: (patientId: string) => void;
}

/**
 * Mobile-only patient list (shown on small screens, hidden on md+).
 * Rendered as a vertically stacked list of `PatientMobileCard` items.
 */
export function PatientMobileList({ patients, onSelectPatient }: PatientMobileListProps) {
  return (
    <div className="md:hidden divide-y divide-[#e7d6bf]/60 max-h-[60vh] overflow-y-auto">
      {patients.map((patient) => (
        <PatientMobileCard key={patient.id} patient={patient} onSelect={onSelectPatient} />
      ))}
    </div>
  );
}

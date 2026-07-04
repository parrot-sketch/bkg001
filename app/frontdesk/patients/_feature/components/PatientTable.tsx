import { PatientTableHeader } from './PatientTableHeader';
import { PatientTableRow } from './PatientTableRow';
import { LIST_MAX_HEIGHT } from '../constants/pagination';
import { cn } from '@/lib/utils';
import type { PatientRegistryDto } from '../types/patient-page';

interface PatientTableProps {
  patients: ReadonlyArray<PatientRegistryDto>;
  onSelectPatient: (patientId: string) => void;
}

/**
 * Desktop-only patient table (hidden on mobile via `hidden md:block`).
 * Composes PatientTableHeader + PatientTableRow for a clean separation.
 */
export function PatientTable({ patients, onSelectPatient }: PatientTableProps) {
  return (
    <div className={cn('hidden md:block overflow-y-auto flex-1', LIST_MAX_HEIGHT)}>
      <table className="w-full">
        <PatientTableHeader />
        <tbody>
          {patients.map((patient) => (
            <PatientTableRow key={patient.id} patient={patient} onSelect={onSelectPatient} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

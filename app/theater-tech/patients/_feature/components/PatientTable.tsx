import { cn } from '@/lib/utils';
import type { PatientRegistryDto } from '../types/patient-page';
import { PatientTableRow } from './PatientTableRow';
import { LIST_MAX_HEIGHT } from '../constants/pagination';

interface PatientTableProps {
  patients: ReadonlyArray<PatientRegistryDto>;
  onSelectPatient: (patientId: string) => void;
}

export function PatientTable({ patients, onSelectPatient }: PatientTableProps) {
  return (
    <div className={cn('hidden md:block overflow-y-auto flex-1', LIST_MAX_HEIGHT)}>
      <table className="w-full">
        <thead className="bg-slate-50 border-b border-slate-200">
          <tr>
            <th className="text-left text-xs font-medium text-slate-500 px-5 py-2.5">Patient</th>
            <th className="text-left text-xs font-medium text-slate-500 px-5 py-2.5">File #</th>
            <th className="hidden lg:table-cell text-left text-xs font-medium text-slate-500 px-5 py-2.5">Phone</th>
            <th className="hidden lg:table-cell text-left text-xs font-medium text-slate-500 px-5 py-2.5">Last Visit</th>
            <th className="text-right text-xs font-medium text-slate-500 px-5 py-2.5">Action</th>
          </tr>
        </thead>
        <tbody>
          {patients.map((patient) => (
            <PatientTableRow key={patient.id} patient={patient} onSelect={onSelectPatient} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

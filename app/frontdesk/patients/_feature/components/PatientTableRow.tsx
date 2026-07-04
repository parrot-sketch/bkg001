import { Phone, Clock } from 'lucide-react';
import { ProfileImage } from '@/components/profile-image';
import { PatientTableActions } from '@/components/frontdesk/PatientTableActions';
import { PatientStatusCell } from './PatientStatusCell';
import { formatLastVisit, formatPatientAge, formatPatientName } from '../utils/formatters';
import type { PatientRegistryDto } from '../types/patient-page';

interface PatientTableRowProps {
  patient: PatientRegistryDto;
  onSelect: (patientId: string) => void;
}

/**
 * A single row in the desktop patient table.
 * Clicking anywhere on the row opens the patient drawer.
 * The actions cell stops propagation so its menu doesn't trigger drawer opening.
 */
export function PatientTableRow({ patient, onSelect }: PatientTableRowProps) {
  const name = formatPatientName(patient.firstName, patient.lastName);
  const age = formatPatientAge(patient.dateOfBirth);
  const lastVisit = formatLastVisit(patient.lastVisitAt);

  return (
    <tr
      className="group transition-colors duration-150 cursor-pointer border-b border-[#e7d6bf]/60 last:border-0 hover:bg-[#e7d6bf]/10"
      onClick={() => onSelect(patient.id)}
    >
      {/* Patient info */}
      <td className="px-5 py-3">
        <div className="flex items-center gap-3">
          <ProfileImage
            url={patient.profileImage}
            name={name}
            bgColor={patient.colorCode}
            className="h-9 w-9"
            textClassName="text-white text-xs font-semibold"
          />
          <div className="min-w-0">
            <p className="text-sm font-medium text-[#2c2e4b] truncate max-w-[180px]">{name}</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-xs text-[#2c2e4b]/50 capitalize">{patient.gender?.toLowerCase()}</span>
              {age && (
                <>
                  <span className="text-[#e7d6bf]">·</span>
                  <span className="text-xs text-[#2c2e4b]/50">{age}</span>
                </>
              )}
            </div>
          </div>
        </div>
      </td>

      {/* File number */}
      <td className="px-5 py-3">
        <span className="inline-flex items-center font-mono text-xs font-medium text-[#2c2e4b] bg-[#e7d6bf]/15 border border-[#e7d6bf] px-2 py-0.5 rounded">
          {patient.fileNumber || '--'}
        </span>
      </td>

      {/* Phone */}
      <td className="px-5 py-3 hidden lg:table-cell">
        {patient.phone ? (
          <div className="flex items-center gap-1.5 text-xs text-[#2c2e4b]/60">
            <Phone className="h-3 w-3 text-[#caa26a]/60 shrink-0" />
            <span className="truncate max-w-[120px]">{patient.phone}</span>
          </div>
        ) : (
          <span className="text-xs text-[#2c2e4b]/30">--</span>
        )}
      </td>

      {/* Last visit */}
      <td className="px-5 py-3 hidden lg:table-cell">
        {lastVisit ? (
          <div className="flex items-center gap-1.5 text-xs text-[#2c2e4b]/60">
            <Clock className="h-3 w-3 text-[#caa26a]/60 shrink-0" />
            {lastVisit}
          </div>
        ) : (
          <span className="text-xs text-[#2c2e4b]/30">No visits</span>
        )}
      </td>

      {/* Queue status */}
      <td className="px-5 py-3">
        <PatientStatusCell queueStatus={patient.queueStatus} />
      </td>

      {/* Actions */}
      <td className="px-5 py-3 text-right">
        <div onClick={(e) => e.stopPropagation()}>
          <PatientTableActions
            patient={{
              id: patient.id,
              firstName: patient.firstName,
              lastName: patient.lastName,
              phone: patient.phone,
              email: patient.email,
            }}
          />
        </div>
      </td>
    </tr>
  );
}

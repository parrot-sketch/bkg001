import { Phone, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ProfileImage } from '@/components/profile-image';
import type { PatientRegistryDto } from '../types/patient-page';
import { formatLastVisit, formatPatientAge, formatPatientName } from '../utils/formatters';

interface PatientTableRowProps {
  patient: PatientRegistryDto;
  onSelect: (patientId: string) => void;
}

export function PatientTableRow({ patient, onSelect }: PatientTableRowProps) {
  const name = formatPatientName(patient.firstName, patient.lastName);
  const age = formatPatientAge(patient.dateOfBirth);
  const lastVisit = formatLastVisit(patient.lastVisitAt);

  return (
    <tr
      className="group transition-colors duration-150 cursor-pointer border-b border-[#e7d6bf]/60 last:border-0 hover:bg-[#e7d6bf]/10"
      onClick={() => onSelect(patient.id)}
    >
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
            <p className="text-sm font-semibold text-black truncate max-w-[180px]">{name}</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-xs text-zinc-700 font-medium capitalize">{patient.gender?.toLowerCase()}</span>
              {age && (
                <>
                  <span className="text-[#e7d6bf]">·</span>
                  <span className="text-xs text-zinc-700 font-medium">{age}</span>
                </>
              )}
            </div>
          </div>
        </div>
      </td>

      <td className="px-5 py-3">
        <span className="inline-flex items-center font-mono text-xs font-semibold text-black bg-[#e7d6bf]/15 border border-[#e7d6bf] px-2 py-0.5 rounded">
          {patient.fileNumber || '--'}
        </span>
      </td>

      <td className="px-5 py-3 hidden lg:table-cell">
        {patient.phone ? (
          <div className="flex items-center gap-1.5 text-xs text-zinc-800 font-medium">
            <Phone className="h-3 w-3 text-zinc-500 shrink-0" />
            <span className="truncate max-w-[120px]">{patient.phone}</span>
          </div>
        ) : (
          <span className="text-xs text-zinc-400">--</span>
        )}
      </td>

      <td className="px-5 py-3 hidden lg:table-cell">
        {lastVisit ? (
          <div className="flex items-center gap-1.5 text-xs text-zinc-800 font-medium">
            <Clock className="h-3 w-3 text-zinc-500 shrink-0" />
            {lastVisit}
          </div>
        ) : (
          <span className="text-xs text-zinc-400">No visits</span>
        )}
      </td>

      <td className="px-5 py-3 text-right">
        <Button
          size="sm"
          variant="ghost"
          className="h-8 text-xs text-[#2c2e4b] hover:bg-[#e7d6bf]/30 rounded-lg"
          onClick={(e) => {
            e.stopPropagation();
            onSelect(patient.id);
          }}
        >
          View
        </Button>
      </td>
    </tr>
  );
}

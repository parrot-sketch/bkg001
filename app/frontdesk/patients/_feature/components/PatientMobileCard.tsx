import { Phone, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ProfileImage } from '@/components/profile-image';
import { PatientTableActions } from '@/components/frontdesk/PatientTableActions';
import { QUEUE_STATUS_CONFIG } from '@/components/frontdesk/PatientDrawer';
import { cn } from '@/lib/utils';
import { formatLastVisit, formatPatientAge, formatPatientName } from '../utils/formatters';
import type { PatientRegistryDto } from '../types/patient-page';

interface PatientMobileCardProps {
  patient: PatientRegistryDto;
  onSelect: (patientId: string) => void;
}

/**
 * A single tappable card in the mobile patient list.
 * Accessible via keyboard (role="button", tabIndex, onKeyDown).
 * The actions area stops propagation so it doesn't open the drawer.
 */
export function PatientMobileCard({ patient, onSelect }: PatientMobileCardProps) {
  const name = formatPatientName(patient.firstName, patient.lastName);
  const age = formatPatientAge(patient.dateOfBirth);
  const lastVisit = formatLastVisit(patient.lastVisitAt);
  const todayStatus = patient.queueStatus ? QUEUE_STATUS_CONFIG[patient.queueStatus] : null;

  return (
    <div
      onClick={() => onSelect(patient.id)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(patient.id);
        }
      }}
      role="button"
      tabIndex={0}
      className="w-full text-left cursor-pointer"
    >
      <div className="p-4 transition-colors hover:bg-[#e7d6bf]/10 active:bg-[#e7d6bf]/20">
        <div className="flex items-start gap-3">
          <ProfileImage
            url={patient.profileImage}
            name={name}
            bgColor={patient.colorCode}
            className="h-10 w-10"
            textClassName="text-white text-xs font-semibold"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-medium text-[#2c2e4b] truncate">{name}</p>
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
              {patient.fileNumber && (
                <span className="font-mono text-[10px] font-medium text-[#2c2e4b] bg-[#e7d6bf]/15 border border-[#e7d6bf] px-2 py-0.5 rounded shrink-0">
                  {patient.fileNumber}
                </span>
              )}
            </div>

            <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1">
              {patient.phone && (
                <div className="flex items-center gap-1 text-xs text-[#2c2e4b]/60">
                  <Phone className="h-3 w-3 text-[#caa26a]/60" />
                  <span>{patient.phone}</span>
                </div>
              )}
              {lastVisit && (
                <div className="flex items-center gap-1 text-xs text-[#2c2e4b]/60">
                  <Clock className="h-3 w-3 text-[#caa26a]/60" />
                  {lastVisit}
                </div>
              )}
              {todayStatus && (
                <Badge
                  variant="outline"
                  className={cn('rounded-none text-[9px] border font-semibold px-1.5 py-0', todayStatus.className)}
                >
                  <span className={cn('h-1.5 w-1.5 rounded-full mr-0.5', todayStatus.dotClassName)} />
                  {todayStatus.label}
                </Badge>
              )}
            </div>

            <div className="mt-3 flex items-center justify-end" onClick={(e) => e.stopPropagation()}>
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
          </div>
        </div>
      </div>
    </div>
  );
}

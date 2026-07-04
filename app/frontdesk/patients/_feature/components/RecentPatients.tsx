'use client';

import { Clock3 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { ProfileImage } from '@/components/profile-image';
import { useRecentPatients } from '../hooks/useRecentPatients';

interface RecentPatientsProps {
  onSelect: (patientId: string) => void;
}

/**
 * Displays a horizontally scrollable strip of recently-viewed patients.
 * All localStorage interaction is delegated to `useRecentPatients`.
 * Returns null when there are no recent IDs stored.
 */
export function RecentPatients({ onSelect }: RecentPatientsProps) {
  const { patients, loading, addToRecent } = useRecentPatients();

  if (patients.length === 0 && !loading) return null;

  const handleSelect = (patientId: string) => {
    addToRecent(patientId);
    onSelect(patientId);
  };

  return (
    <Card className="border border-[#e7d6bf] bg-white shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Clock3 className="h-3.5 w-3.5 text-[#caa26a]" />
          <p className="text-xs font-semibold text-[#2c2e4b]">Recently Viewed</p>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
          {loading
            ? Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-16 w-32 rounded-lg bg-[#e7d6bf]/10 shrink-0 animate-pulse" />
              ))
            : patients.map((patient) => {
                const name = `${patient.firstName} ${patient.lastName}`;
                return (
                  <button
                    key={patient.id}
                    onClick={() => handleSelect(patient.id)}
                    className="flex flex-col items-center gap-1.5 p-2 rounded-lg border border-[#e7d6bf] bg-white hover:bg-[#e7d6bf]/10 hover:border-[#caa26a]/40 transition-all shrink-0 min-w-[100px]"
                  >
                    <ProfileImage
                      url={patient.profileImage}
                      name={name}
                      bgColor={patient.colorCode}
                      className="h-8 w-8"
                      textClassName="text-white text-[10px] font-semibold"
                    />
                    <div className="text-center min-w-0">
                      <p className="text-xs font-medium text-[#2c2e4b] truncate w-full">{name.split(' ')[0]}</p>
                      <p className="text-[10px] text-[#2c2e4b]/40 font-mono">{patient.fileNumber}</p>
                    </div>
                  </button>
                );
              })}
        </div>
      </CardContent>
    </Card>
  );
}

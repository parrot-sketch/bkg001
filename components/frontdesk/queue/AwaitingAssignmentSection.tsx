import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, Clock, CheckCircle2, XCircle } from 'lucide-react';
import type { FrontdeskCheckedInPatient } from '@/hooks/frontdesk/use-frontdesk-dashboard';
import type { DoctorAvailabilityResponseDto } from '@/application/dtos/DoctorAvailabilityResponseDto';
import { useDoctorsAvailability } from '@/hooks/schedule/useDoctorAvailability';
import { useMemo, useState } from 'react';

interface AwaitingAssignmentSectionProps {
  patients: FrontdeskCheckedInPatient[];
  loading: boolean;
  error: Error | null;
  onAssign: (patient: FrontdeskCheckedInPatient, doctorId: string) => void;
  actionLoading?: string | null;
}

function getNowStatus(doctor: DoctorAvailabilityResponseDto, now: Date): string {
  const dayName = now.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
  const wd = doctor.workingDays?.find((d) => (d.day || '').toLowerCase() === dayName);
  if (!wd?.isAvailable) return 'OFF';

  const nowMins = now.getHours() * 60 + now.getMinutes();
  const sessions = wd.sessions?.length && wd.sessions.length > 0
    ? wd.sessions
    : [{ startTime: wd.startTime, endTime: wd.endTime }];

  const inSession = sessions.some((s) => nowMins >= timeToMinutes(s.startTime) && nowMins < timeToMinutes(s.endTime));
  if (inSession) return 'AVAILABLE';

  const later = sessions.some((s) => nowMins < timeToMinutes(s.startTime));
  return later ? 'LATER_TODAY' : 'OFF';
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map((v) => Number(v));
  return (h || 0) * 60 + (m || 0);
}

export function AwaitingAssignmentSection({ patients, loading, error, onAssign, actionLoading }: AwaitingAssignmentSectionProps) {
  const today = useMemo(() => new Date(), []);
  const { data: availabilityDoctors = [], isLoading: loadingDoctors } = useDoctorsAvailability(today, today, { enabled: true });
  const [showDoctorSelect, setShowDoctorSelect] = useState<number | null>(null);
  const [selectedDoctor, setSelectedDoctor] = useState<string>('');

  const availabilityByDoctorId = useMemo(() => {
    const map = new Map<string, string>();
    availabilityDoctors.forEach((d) => {
      map.set(d.doctorId, getNowStatus(d, today));
    });
    return map;
  }, [availabilityDoctors, today]);

  if (patients.length === 0) return null;

  return (
    <Card className="border border-[#e7d6bf] bg-white">
      <div className="px-4 py-3 border-b border-[#e7d6bf] flex items-center justify-between">
        <div className="text-sm font-semibold text-[#2c2e4b] flex items-center gap-2">
          <div className="h-8 w-8 border border-[#e7d6bf] bg-[#e7d6bf]/30 flex items-center justify-center">
            <Clock className="h-4 w-4 text-[#caa26a]" />
          </div>
          Awaiting Assignment
        </div>
        <Badge variant="outline" className="rounded-none text-xs border-[#e7d6bf] text-[#2c2e4b] font-semibold">
          {loading ? '…' : patients.length}
        </Badge>
      </div>

      <div className="p-0">
        {loading ? (
          <div className="p-4 flex justify-center">
            <Loader2 className="h-4 w-4 animate-spin text-[#caa26a]" />
          </div>
        ) : error ? (
          <div className="p-3 text-center">
            <p className="text-xs text-[#2c2e4b]/60">
              Unable to load.{' '}
              <button onClick={() => window.location.reload()} className="text-[#0c5d69] underline hover:no-underline">
                Retry
              </button>
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[#e7d6bf]/60">
            {patients.map((patient) => (
              <div key={patient.id} className="px-4 py-3 hover:bg-[#e7d6bf]/10 transition-colors">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-[#2c2e4b] truncate">
                      {patient.patient.firstName} {patient.patient.lastName}
                    </p>
                    <p className="text-xs text-[#2c2e4b]/60 mt-0.5">
                      {patient.patient.fileNumber}
                      {' · '}
                      {patient.isWalkIn ? 'Walk-in' : patient.time || 'No time'}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                    {showDoctorSelect === patient.id ? (
                      <>
                        <select
                          className="text-xs border border-[#e7d6bf] rounded-lg px-2 py-1.5 max-w-[140px] focus:outline-none focus:ring-2 focus:ring-[#caa26a]/30 focus:border-[#caa26a] bg-white text-[#2c2e4b]"
                          value={selectedDoctor}
                          onChange={(e) => setSelectedDoctor(e.target.value)}
                          disabled={loadingDoctors}
                        >
                          <option value="">{loadingDoctors ? 'Loading…' : 'Select doctor'}</option>
                          {availabilityDoctors.map((doc) => {
                            const status = availabilityByDoctorId.get(doc.doctorId);
                            const suffix = status === 'AVAILABLE' ? ' · Available' : status === 'LATER_TODAY' ? ' · Later' : ' · Off';
                            return (
                              <option key={doc.doctorId} value={doc.doctorId}>
                                {doc.doctorName}{suffix}
                              </option>
                            );
                          })}
                        </select>
                        <Button
                          size="sm"
                          onClick={() => onAssign(patient, selectedDoctor)}
                          disabled={!selectedDoctor || actionLoading === `assign-${patient.id}`}
                          className="h-8 w-8 p-0 bg-[#caa26a] hover:bg-[#b8913e] text-[#2c2e4b] rounded-lg"
                        >
                          {actionLoading === `assign-${patient.id}` ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => { setShowDoctorSelect(null); setSelectedDoctor(''); }}
                          className="h-8 w-8 p-0 text-[#2c2e4b]/40 hover:text-[#2c2e4b] hover:bg-[#e7d6bf]/30 rounded-lg"
                        >
                          <XCircle className="h-3.5 w-3.5" />
                        </Button>
                      </>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => setShowDoctorSelect(patient.id)}
                        className="h-8 px-3 text-xs bg-[#caa26a] hover:bg-[#b8913e] text-[#2c2e4b] rounded-lg font-medium"
                      >
                        Assign
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}

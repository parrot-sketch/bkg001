/**
 * Responsive fixes for 1920×1200 viewport:
 * - Wrapper scroll: added max-h-[calc(100vh-320px)] overflow-y-auto (prevents overflow)
 * - Patient row padding: px-4 py-3 → px-3 py-2.5 (tighter density)
 * - Doctor group row padding: px-4 py-3 → px-3 py-2.5
 * - Patient row in live queue: px-3 py-2 stays (already compact)
 */

import { useMemo, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Users, 
  Clock, 
  UserPlus, 
  Loader2,
  CheckCircle,
  XCircle,
  UserMinus,
  RefreshCw
} from 'lucide-react';
import { useCheckedInAwaitingAssignment, useLiveQueueBoard, invalidateFrontdeskCache } from '@/hooks/frontdesk/use-frontdesk-dashboard';
import type { FrontdeskCheckedInPatient } from '@/hooks/frontdesk/use-frontdesk-dashboard';
import { assignPatientToQueue, removeFromQueue, reassignQueue } from '@/app/actions/appointment';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { queryKeys } from '@/lib/constants/queryKeys';
import { useQueryClient } from '@tanstack/react-query';
import { useDoctorsAvailability } from '@/hooks/schedule/useDoctorAvailability';
import type { DoctorAvailabilityResponseDto } from '@/application/dtos/DoctorAvailabilityResponseDto';

type CheckedInPatient = FrontdeskCheckedInPatient;

function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map((v) => Number(v));
  return (h || 0) * 60 + (m || 0);
}

type AvailabilityNowStatus = 'AVAILABLE' | 'LATER_TODAY' | 'OFF';

function getNowStatus(doctor: DoctorAvailabilityResponseDto, now: Date): AvailabilityNowStatus {
  const dayName = format(now, 'EEEE').toLowerCase();
  const wd = doctor.workingDays?.find((d) => (d.day || '').toLowerCase() === dayName);
  if (!wd?.isAvailable) return 'OFF';

  const nowMins = now.getHours() * 60 + now.getMinutes();
  const sessions =
    wd.sessions?.length && wd.sessions.length > 0
      ? wd.sessions
      : [{ startTime: wd.startTime, endTime: wd.endTime }];

  const inSession = sessions.some((s) => nowMins >= timeToMinutes(s.startTime) && nowMins < timeToMinutes(s.endTime));
  if (inSession) return 'AVAILABLE';

  const later = sessions.some((s) => nowMins < timeToMinutes(s.startTime));
  return later ? 'LATER_TODAY' : 'OFF';
}

export function QueueManagementPanels() {
  const queryClient = useQueryClient();
  const { data: checkedInAwaiting, isLoading: loadingCheckedIn, error: errorCheckedIn, refetch: refetchCheckedIn } = useCheckedInAwaitingAssignment();
  const { data: liveQueue, isLoading: loadingQueue, error: errorQueue, refetch: refetchQueue } = useLiveQueueBoard();
  const [showDoctorSelect, setShowDoctorSelect] = useState<number | null>(null);
  const [selectedDoctor, setSelectedDoctor] = useState<string>('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const handleAssignToQueue = async (patient: CheckedInPatient) => {
    if (!selectedDoctor) return;
    setActionLoading(`assign-${patient.id}`);
    try {
      const result = await assignPatientToQueue({
        patientId: patient.patientId,
        doctorId: selectedDoctor,
        appointmentId: patient.isWalkIn ? undefined : patient.id,
      });
      if (result.success) {
        setShowDoctorSelect(null);
        setSelectedDoctor('');
        await invalidateFrontdeskCache();
        refetchCheckedIn();
        refetchQueue();
        queryClient.invalidateQueries({ queryKey: queryKeys.nurse.clinicQueue('today') });
      }
    } catch (error) {
      console.error('Error assigning patient:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleRemoveFromQueue = async (queueId: number) => {
    if (!confirm('Remove this patient from the queue?')) return;
    setActionLoading(`remove-${queueId}`);
    try {
      const result = await removeFromQueue(queueId, 'Removed by frontdesk');
      if (result.success) {
        await invalidateFrontdeskCache();
        refetchCheckedIn();
        refetchQueue();
      }
    } catch (error) {
      console.error('Error removing patient:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const today = useMemo(() => new Date(), []);
  const { data: availabilityDoctors = [], isLoading: loadingDoctors } = useDoctorsAvailability(today, today, { enabled: true });
  const availabilityByDoctorId = useMemo(() => {
    const now = new Date();
    const map = new Map<string, AvailabilityNowStatus>();
    availabilityDoctors.forEach((d) => {
      map.set(d.doctorId, getNowStatus(d, now));
    });
    return map;
  }, [availabilityDoctors]);

  return (
    <div className="space-y-3 max-h-[calc(100vh-320px)] overflow-y-auto">

      {/* Checked In — Awaiting Assignment */}
      <Card className="border-[#0c5d69]/15 shadow-sm bg-white overflow-hidden rounded-xl">
        <CardHeader className="border-b border-[#0c5d69]/15 bg-[#0c5d69] py-3 px-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
              <Clock className="h-4 w-4 text-white/80" />
              Awaiting Assignment
            </CardTitle>
            <Badge variant="outline" className="bg-white/15 text-white border-white/20 text-xs font-bold backdrop-blur-sm">
              {loadingCheckedIn ? '…' : checkedInAwaiting?.length || 0}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {loadingCheckedIn ? (
            <div className="p-5 flex justify-center">
              <Loader2 className="h-4 w-4 animate-spin text-[#0c5d69]" />
            </div>
          ) : errorCheckedIn ? (
            <div className="p-4 text-center">
              <p className="text-xs text-slate-500">
                Unable to load.{' '}
                <button onClick={() => refetchCheckedIn()} className="text-[#0c5d69] underline hover:no-underline">
                  Retry
                </button>
              </p>
            </div>
          ) : checkedInAwaiting && checkedInAwaiting.length > 0 ? (
            <div className="divide-y divide-slate-100">
              {checkedInAwaiting.map((patient) => (
                <div key={patient.id} className="px-3 py-2.5 hover:bg-[#e6f0f1] transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[#121c1d] truncate">
                        {patient.patient.firstName} {patient.patient.lastName}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {patient.patient.fileNumber}
                        {' · '}
                        {patient.isWalkIn ? 'Walk-in' : patient.time || 'No time'}
                        {' · '}
                        <span className="text-[#0c5d69] font-medium">{patient.waitTime}</span>
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                      {showDoctorSelect === patient.id ? (
                        <>
                          <select
                            className="text-xs border border-slate-200 rounded-md px-2 py-1 max-w-[140px] focus:outline-none focus:ring-2 focus:ring-[#0c5d69]/30 focus:border-[#0c5d69]"
                            value={selectedDoctor}
                            onChange={(e) => setSelectedDoctor(e.target.value)}
                            disabled={loadingDoctors}
                          >
                            <option value="">{loadingDoctors ? 'Loading…' : 'Select doctor'}</option>
                            {availabilityDoctors.map((doc) => {
                              const status = availabilityByDoctorId.get(doc.doctorId);
                              const suffix = status === 'AVAILABLE' ? ' · ✓' : status === 'LATER_TODAY' ? ' · Later' : ' · Off';
                              return (
                                <option key={doc.doctorId} value={doc.doctorId}>
                                  {doc.doctorName}{suffix}
                                </option>
                              );
                            })}
                          </select>
                          <Button
                            size="sm"
                            onClick={() => handleAssignToQueue(patient)}
                            disabled={!selectedDoctor || actionLoading === `assign-${patient.id}`}
                            className="h-7 w-7 p-0 bg-[#0c5d69] hover:bg-[#0a4f59] text-white rounded-md shadow-[0_1px_2px_rgba(12,93,105,0.2)]"
                          >
                            {actionLoading === `assign-${patient.id}` ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <CheckCircle className="h-3 w-3" />
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => { setShowDoctorSelect(null); setSelectedDoctor(''); }}
                            className="h-7 w-7 p-0 text-slate-400 hover:text-slate-600"
                          >
                            <XCircle className="h-3 w-3" />
                          </Button>
                        </>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => setShowDoctorSelect(patient.id)}
                          className="h-7 px-2.5 text-xs bg-[#0c5d69] hover:bg-[#0a4f59] text-white rounded-md font-medium shadow-[0_1px_2px_rgba(12,93,105,0.2)]"
                        >
                          <UserPlus className="h-3 w-3 mr-1" />
                          Assign
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="px-4 py-5 text-center text-xs text-slate-400">
              No patients awaiting assignment
            </div>
          )}
        </CardContent>
      </Card>

      {/* Live Queue Board */}
      <Card className="border-[#0c5d69]/15 shadow-sm bg-white overflow-hidden rounded-xl">
        <CardHeader className="border-b border-[#0c5d69]/15 bg-[#0c5d69] py-3 px-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
              <Users className="h-4 w-4 text-white/80" />
              Live Queue
            </CardTitle>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => { refetchCheckedIn(); refetchQueue(); }}
              className="h-7 w-7 p-0 text-white/80 hover:text-white hover:bg-white/10"
            >
              <RefreshCw className="h-3 w-3" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {loadingQueue ? (
            <div className="p-5 flex justify-center">
              <Loader2 className="h-4 w-4 animate-spin text-[#0c5d69]" />
            </div>
          ) : errorQueue ? (
            <div className="p-4 text-center">
              <p className="text-xs text-slate-500">
                Unable to load.{' '}
                <button onClick={() => refetchQueue()} className="text-[#0c5d69] underline hover:no-underline">
                  Retry
                </button>
              </p>
            </div>
          ) : liveQueue && liveQueue.length > 0 ? (
            <div className="divide-y divide-slate-100">
              {liveQueue.map((doctorGroup) => (
                <div key={doctorGroup.doctorId} className="px-3 py-2.5">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-semibold text-[#0c5d69] uppercase tracking-wide">
                      {doctorGroup.doctorName}
                    </p>
                    <Badge variant="outline" className="text-[10px] bg-[#DFAC0D]/10 text-[#9a7709] border-[#DFAC0D]/30 font-semibold">
                      {doctorGroup.patients.length} waiting
                    </Badge>
                  </div>
                  <div className="space-y-1.5">
                    {doctorGroup.patients.map((patient) => (
                      <div
                        key={patient.id}
                        className="flex items-center justify-between px-3 py-2 bg-slate-50 rounded-lg border border-slate-100"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-medium text-[#121c1d] truncate">
                              {patient.patient.firstName} {patient.patient.lastName}
                            </span>
                            {patient.isWalkIn && (
                              <Badge variant="outline" className="text-[9px] bg-slate-100 text-slate-500 border-slate-200 shrink-0 px-1.5 py-0">
                                Walk-in
                              </Badge>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            Wait: <span className="text-[#0c5d69] font-medium">{patient.waitTime}</span>
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <Badge
                            variant="outline"
                            className={cn(
                              'text-[9px] px-1.5 py-0 font-medium',
                              patient.status === 'IN_CONSULTATION'
                                ? 'bg-rose-50 text-rose-600 border-rose-200'
                                : 'bg-[#DFAC0D]/10 text-[#9a7709] border-[#DFAC0D]/30'
                            )}
                          >
                            {patient.status === 'IN_CONSULTATION' ? 'In progress' : 'Waiting'}
                          </Badge>
                          {patient.status === 'WAITING' && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleRemoveFromQueue(patient.id)}
                              disabled={actionLoading === `remove-${patient.id}`}
                              className="h-6 w-6 p-0 text-slate-300 hover:text-rose-500 hover:bg-rose-50"
                            >
                              {actionLoading === `remove-${patient.id}` ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <UserMinus className="h-3 w-3" />
                              )}
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="px-4 py-5 text-center text-xs text-slate-400">
              No patients in queue
            </div>
          )}
        </CardContent>
      </Card>

    </div>
  );
}

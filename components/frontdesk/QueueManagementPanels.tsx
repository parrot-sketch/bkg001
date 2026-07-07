/**
 * Queue Management Panel - Combined view
 * 
 * Shows patients awaiting assignment (checked-in but not in any queue)
 * and the live queue organized by doctor.
 * 
 * Branded with Nairobi Sculpt light palette: white cards, beige borders,
 * navy typography, and gold accents.
 */
import { useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Users, 
  Clock, 
  UserPlus, 
  Loader2,
  CheckCircle2,
  XCircle,
  UserMinus,
  RefreshCw
} from 'lucide-react';
import { useCheckedInAwaitingAssignment, useLiveQueueBoard, invalidateFrontdeskCache, useCheckIn, useFrontdeskDashboard } from '@/hooks/frontdesk/use-frontdesk-dashboard';
import type { FrontdeskCheckedInPatient } from '@/hooks/frontdesk/use-frontdesk-dashboard';
import { assignPatientToQueue, removeFromQueue } from '@/app/actions/appointment';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { useQueryClient } from '@tanstack/react-query';
import { useDoctorsAvailability } from '@/hooks/schedule/useDoctorAvailability';
import type { DoctorAvailabilityResponseDto } from '@/application/dtos/DoctorAvailabilityResponseDto';
import { toast } from 'sonner';

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
  const { data: checkedInAwaiting, isLoading: loadingAwaiting, error: errorAwaiting, refetch: refetchAwaiting } = useCheckedInAwaitingAssignment();
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
        refetchAwaiting();
        refetchQueue();
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
        refetchAwaiting();
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

  const totalInQueue = liveQueue?.reduce((sum, g) => sum + g.patients.length, 0) ?? 0;
  const hasAwaiting = checkedInAwaiting && checkedInAwaiting.length > 0;
  const hasLiveQueue = liveQueue && liveQueue.length > 0;

  const { data: dashboard, isLoading: loadingDashboard } = useFrontdeskDashboard();
  const scheduledAppointments = dashboard?.todaysSchedule?.scheduled ?? [];
  const checkInMutation = useCheckIn();

  const handleCheckIn = async (appointmentId: number) => {
    setActionLoading(`checkin-${appointmentId}`);
    try {
      await checkInMutation.mutateAsync({
        appointmentId,
        notes: 'Checked in at frontdesk',
      });
      toast.success('Patient checked in successfully');
      refetchAwaiting();
      refetchQueue();
    } catch (error) {
      console.error('Error checking in patient:', error);
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="space-y-5 w-full">
      {/* Check-In Section - Show scheduled/confirmed appointments that need check-in */}
      {scheduledAppointments.length > 0 && (
        <div className="border border-[#e7d6bf] bg-white">
          <div className="px-4 py-3 border-b border-[#e7d6bf] flex items-center justify-between">
            <div className="text-sm font-semibold text-[#2c2e4b] flex items-center gap-2">
              <div className="h-8 w-8 border border-[#e7d6bf] bg-[#caa26a]/10 flex items-center justify-center">
                <UserPlus className="h-4 w-4 text-[#caa26a]" />
              </div>
              Arriving Today — Check In
            </div>
            <Badge variant="outline" className="rounded-none text-xs border-[#e7d6bf] text-[#2c2e4b] font-semibold">
              {loadingDashboard ? '…' : scheduledAppointments.length}
            </Badge>
          </div>
          <div className="p-0">
            {loadingDashboard ? (
              <div className="p-4 flex justify-center">
                <Loader2 className="h-4 w-4 animate-spin text-[#caa26a]" />
              </div>
            ) : (
              <div className="divide-y divide-[#e7d6bf]/60">
                {scheduledAppointments.map((appointment) => {
                  const patientName = appointment.patient
                    ? `${appointment.patient.firstName} ${appointment.patient.lastName}`
                    : 'Unknown Patient';
                  const isLoading = actionLoading === `checkin-${appointment.id}`;

                  return (
                    <div key={appointment.id} className="px-4 py-3 hover:bg-[#e7d6bf]/10 transition-colors">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-[#2c2e4b] truncate">{patientName}</p>
                            {appointment.patient?.fileNumber && (
                              <span className="text-[10px] text-[#2c2e4b]/50 font-mono shrink-0">
                                #{appointment.patient.fileNumber}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-[#2c2e4b]/60">{appointment.type || 'Consultation'}</span>
                            <span className="text-[#e7d6bf]">•</span>
                            <span className="text-xs text-[#2c2e4b]/60">
                              {appointment.time || '--:--'}
                            </span>
                            {appointment.doctor?.name && (
                              <>
                                <span className="text-[#e7d6bf]">•</span>
                                <span className="text-xs text-[#2c2e4b]/60 truncate">{appointment.doctor.name}</span>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Button
                            size="sm"
                            onClick={() => handleCheckIn(appointment.id)}
                            disabled={isLoading}
                            className="h-8 px-3 text-xs bg-[#caa26a] hover:bg-[#b8913e] text-[#2c2e4b] rounded-lg font-medium"
                          >
                            {isLoading ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <>
                                <UserPlus className="h-3.5 w-3.5 mr-1.5" />
                                Check In
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Awaiting Assignment - Only show if there are patients */}
      {hasAwaiting && (
        <div className="border border-[#e7d6bf] bg-white">
          <div className="px-4 py-3 border-b border-[#e7d6bf] flex items-center justify-between">
            <div className="text-sm font-semibold text-[#2c2e4b] flex items-center gap-2">
              <div className="h-8 w-8 border border-[#e7d6bf] bg-[#e7d6bf]/30 flex items-center justify-center">
                <Clock className="h-4 w-4 text-[#caa26a]" />
              </div>
              Awaiting Assignment
            </div>
            <Badge variant="outline" className="rounded-none text-xs border-[#e7d6bf] text-[#2c2e4b] font-semibold">
              {loadingAwaiting ? '…' : checkedInAwaiting?.length || 0}
            </Badge>
          </div>

          <div className="p-0">
            {loadingAwaiting ? (
              <div className="p-4 flex justify-center">
                <Loader2 className="h-4 w-4 animate-spin text-[#caa26a]" />
              </div>
            ) : errorAwaiting ? (
              <div className="p-3 text-center">
                <p className="text-xs text-[#2c2e4b]/60">
                  Unable to load.{' '}
                  <button onClick={() => refetchAwaiting()} className="text-[#0c5d69] underline hover:no-underline">
                    Retry
                  </button>
                </p>
              </div>
            ) : (
              <div className="divide-y divide-[#e7d6bf]/60">
                {checkedInAwaiting!.map((patient) => (
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
                              onClick={() => handleAssignToQueue(patient)}
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
                            <UserPlus className="h-3.5 w-3.5 mr-1.5" />
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
        </div>
      )}

      {/* Live Queue Board - Always shown */}
      <div className="border border-[#e7d6bf] bg-white">
        <div className="px-4 py-3 border-b border-[#e7d6bf] flex items-center justify-between">
          <div className="text-sm font-semibold text-[#2c2e4b] flex items-center gap-2">
            <div className="h-8 w-8 border border-[#e7d6bf] bg-[#e7d6bf]/30 flex items-center justify-center">
              <Users className="h-4 w-4 text-[#caa26a]" />
            </div>
            Live Queue
          </div>
          <Badge variant="outline" className="rounded-none text-xs border-[#e7d6bf] text-[#2c2e4b] font-semibold">
            {totalInQueue}
          </Badge>
        </div>

        <div className="p-0">
          {loadingQueue ? (
            <div className="p-4 flex justify-center">
              <Loader2 className="h-4 w-4 animate-spin text-[#caa26a]" />
            </div>
          ) : errorQueue ? (
            <div className="p-3 text-center">
              <p className="text-xs text-[#2c2e4b]/60">
                Unable to load.{' '}
                <button onClick={() => refetchQueue()} className="text-[#0c5d69] underline hover:no-underline">
                  Retry
                </button>
              </p>
            </div>
          ) : !hasLiveQueue ? (
            <div className="px-4 py-6 text-center text-xs text-[#2c2e4b]/40">
              No patients in queue
            </div>
          ) : (
            <div className="divide-y divide-[#e7d6bf]/60">
              {liveQueue!.map((doctorGroup) => (
                <div key={doctorGroup.doctorId} className="px-4 py-3">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-semibold text-[#2c2e4b] uppercase tracking-wide">
                      {doctorGroup.doctorName}
                    </p>
                    <span className="text-[10px] text-[#2c2e4b]/40">
                      {doctorGroup.patients.filter(p => p.status === 'WAITING').length} waiting · {doctorGroup.patients.filter(p => p.status === 'IN_CONSULTATION').length} in progress
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    {doctorGroup.patients.map((patient) => (
                      <div
                        key={patient.id}
                        className="flex items-center justify-between px-3 py-2 bg-[#e7d6bf]/8 rounded-lg border border-[#e7d6bf]/60"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-medium text-[#2c2e4b] truncate">
                              {patient.patient.firstName} {patient.patient.lastName}
                            </span>
                            {patient.isWalkIn && (
                              <Badge variant="outline" className="text-[9px] bg-[#e7d6bf]/20 text-[#2c2e4b]/70 border-[#e7d6bf] shrink-0 px-1.5 py-0 rounded-none">
                                Walk-in
                              </Badge>
                            )}
                          </div>
                          <p className="text-[10px] text-[#2c2e4b]/50 mt-0.5">
                            Wait: <span className="text-[#0c5d69] font-medium">{patient.waitTime}</span>
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <Badge
                            variant="outline"
                            className={cn(
                              'text-[9px] px-1.5 py-0 font-medium rounded-none',
                              patient.status === 'IN_CONSULTATION'
                                ? 'bg-[#caa26a]/10 text-[#9a7709] border-[#caa26a]/40'
                                : 'bg-[#e7d6bf]/20 text-[#2c2e4b]/70 border-[#e7d6bf]'
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
                              className="h-6 w-6 p-0 text-[#2c2e4b]/30 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                            >
                              {actionLoading === `remove-${patient.id}` ? (
                                <Loader2 className="h-2.5 w-2.5 animate-spin" />
                              ) : (
                                <UserMinus className="h-2.5 w-2.5" />
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
          )}
        </div>
      </div>
    </div>
  );
}

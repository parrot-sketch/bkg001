'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Users, 
  Clock, 
  UserPlus, 
  MoreHorizontal, 
  ArrowRight, 
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
import { patientApi } from '@/lib/api/patient';
import { DoctorResponseDto } from '@/application/dtos/DoctorResponseDto';

// Re-export type for use in handlers
type CheckedInPatient = FrontdeskCheckedInPatient;

export function QueueManagementPanels() {
  const { data: checkedInAwaiting, isLoading: loadingCheckedIn, refetch: refetchCheckedIn } = useCheckedInAwaitingAssignment();
  const { data: liveQueue, isLoading: loadingQueue, refetch: refetchQueue } = useLiveQueueBoard();
  const [assigningId, setAssigningId] = useState<number | null>(null);
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
      } else {
        console.error('Failed to assign patient:', result.msg);
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
      } else {
        console.error('Failed to remove patient:', result.msg);
      }
    } catch (error) {
      console.error('Error removing patient:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleReassign = async (queueId: number, newDoctorId: string) => {
    setActionLoading(`reassign-${queueId}`);
    try {
      const result = await reassignQueue(queueId, newDoctorId);
      
      if (result.success) {
        await invalidateFrontdeskCache();
        refetchQueue();
      } else {
        console.error('Failed to reassign patient:', result.msg);
      }
    } catch (error) {
      console.error('Error reassigning patient:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const [doctors, setDoctors] = useState<DoctorResponseDto[]>([]);
  const [loadingDoctors, setLoadingDoctors] = useState(true);

  useEffect(() => {
    async function fetchDoctors() {
      try {
        const response = await patientApi.getAllDoctors();
        if (response.success && response.data) {
          setDoctors(response.data);
        }
      } catch (error) {
        console.error('Failed to fetch doctors:', error);
      } finally {
        setLoadingDoctors(false);
      }
    }
    fetchDoctors();
  }, []);

  return (
    <div className="space-y-6">
      {/* Panel A: Checked In Awaiting Assignment */}
      <Card className="border-slate-200 shadow-sm bg-white overflow-hidden rounded-xl">
        <CardHeader className="border-b border-slate-100 bg-slate-50/50 py-3 px-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold text-slate-800 flex items-center gap-2">
              <Clock className="h-4 w-4 text-slate-600" />
              Checked In — Awaiting Assignment
            </CardTitle>
            <Badge variant="outline" className="bg-slate-100 text-slate-700 border-slate-200">
              {loadingCheckedIn ? '...' : checkedInAwaiting?.length || 0}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loadingCheckedIn ? (
            <div className="p-6 flex justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
            </div>
          ) : checkedInAwaiting && checkedInAwaiting.length > 0 ? (
            <div className="divide-y divide-slate-100">
              {checkedInAwaiting.map((patient) => (
                <div key={patient.id} className="p-4 hover:bg-slate-50/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-900 truncate">
                        {patient.patient.firstName} {patient.patient.lastName}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-slate-500">
                          {patient.patient.fileNumber}
                        </span>
                        <span className="text-slate-300">•</span>
                        <span className="text-xs text-slate-500">
                          {patient.isWalkIn ? 'Walk-in' : patient.time || 'No time'}
                        </span>
                        <span className="text-slate-300">•</span>
                        <span className="text-xs text-slate-600 font-medium">
                          {patient.waitTime}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 ml-4">
                      {showDoctorSelect === patient.id ? (
                        <div className="flex items-center gap-2">
                          <select
                            className="text-sm border border-slate-200 rounded-md px-2 py-1 max-w-[140px]"
                            value={selectedDoctor}
                            onChange={(e) => setSelectedDoctor(e.target.value)}
                            disabled={loadingDoctors}
                          >
                            <option value="">{loadingDoctors ? 'Loading...' : 'Select doctor...'}</option>
                            {doctors.map((doc) => {
                              const docName = doc.name || `${doc.firstName} ${doc.lastName}`;
                              const displayName = doc.title && !docName.toLowerCase().startsWith(doc.title.toLowerCase())
                                ? `${doc.title} ${docName}`
                                : docName;
                              return (
                                <option key={doc.id} value={doc.id}>
                                  {displayName}
                                </option>
                              );
                            })}
                          </select>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleAssignToQueue(patient)}
                            disabled={!selectedDoctor || actionLoading === `assign-${patient.id}`}
                            className="h-7 bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200"
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
                            onClick={() => {
                              setShowDoctorSelect(null);
                              setSelectedDoctor('');
                            }}
                            className="h-7"
                          >
                            <XCircle className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => setShowDoctorSelect(patient.id)}
                          className="h-7 bg-slate-800 hover:bg-slate-700 text-white text-xs"
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
            <div className="p-6 text-center text-slate-500 text-sm">
              No patients awaiting assignment
            </div>
          )}
        </CardContent>
      </Card>

      {/* Panel B: Live Queue Board */}
      <Card className="border-slate-200 shadow-sm bg-white overflow-hidden rounded-xl">
        <CardHeader className="border-b border-slate-100 bg-slate-50/50 py-3 px-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold text-slate-800 flex items-center gap-2">
              <Users className="h-4 w-4 text-slate-600" />
              Live Queue Board
            </CardTitle>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                refetchCheckedIn();
                refetchQueue();
              }}
              className="h-7 text-slate-500 hover:text-slate-700"
            >
              <RefreshCw className="h-3 w-3" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loadingQueue ? (
            <div className="p-6 flex justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
            </div>
          ) : liveQueue && liveQueue.length > 0 ? (
            <div className="divide-y divide-slate-100">
              {liveQueue.map((doctorGroup) => (
                <div key={doctorGroup.doctorId} className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-slate-800 text-sm">
                      {doctorGroup.doctorName}
                    </h4>
                    <Badge variant="outline" className="bg-slate-100 text-slate-700 border-slate-200 text-xs">
                      {doctorGroup.patients.length} waiting
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    {doctorGroup.patients.map((patient) => (
                      <div
                        key={patient.id}
                        className="flex items-center justify-between p-2 bg-slate-50 rounded-lg"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-slate-900 truncate flex items-center gap-2">
                            <span className="truncate">
                              {patient.patient.firstName} {patient.patient.lastName}
                            </span>
                            {patient.isWalkIn && (
                              <Badge variant="outline" className="text-[10px] bg-slate-100 text-slate-600 border-slate-200 shrink-0">
                                Walk-in
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-slate-500">
                            Waiting: {patient.waitTime}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <Badge
                            variant="outline"
                            className={cn(
                              'text-[10px]',
                              patient.status === 'IN_CONSULTATION'
                                ? 'bg-slate-200 text-slate-700 border-slate-300'
                                : 'bg-slate-100 text-slate-600 border-slate-200'
                            )}
                          >
                            {patient.status === 'IN_CONSULTATION' ? 'In Progress' : 'Waiting'}
                          </Badge>
                          {patient.status === 'WAITING' && (
                            <>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleRemoveFromQueue(patient.id)}
                                disabled={actionLoading === `remove-${patient.id}`}
                                className="h-6 w-6 p-0 text-slate-400 hover:text-red-600"
                              >
                                {actionLoading === `remove-${patient.id}` ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <UserMinus className="h-3 w-3" />
                                )}
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-6 text-center text-slate-500 text-sm">
              No patients in queue
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

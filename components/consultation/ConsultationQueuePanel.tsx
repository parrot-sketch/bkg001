'use client';

/**
 * Consultation Queue Panel
 * 
 * A compact, collapsible panel showing patients waiting for consultation.
 * Designed to be embedded in the consultation interface so doctors can
 * see the queue without leaving the current session.
 * 
 * Features:
 * - Real-time queue updates (via React Query)
 * - Compact patient cards with wait time
 * - Quick action to switch to next patient
 * - Collapsible to maximize workspace when needed
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Users, 
  Clock, 
  Play, 
  ChevronRight, 
  ChevronLeft,
  UserCheck,
  AlertCircle
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import type { AppointmentResponseDto } from '@/application/dtos/AppointmentResponseDto';
import { AppointmentStatus } from '@/domain/enums/AppointmentStatus';
import { useAuth } from '@/hooks/patient/useAuth';
import { doctorApi } from '@/lib/api/doctor';
import { toast } from 'sonner';

interface ConsultationQueuePanelProps {
  /** Current appointment being consulted (to exclude from queue) */
  currentAppointmentId?: number;
  /** All today's appointments (filtered to waiting patients) */
  appointments: AppointmentResponseDto[];
  /** Callback when consultation is complete and switching to next */
  onSwitchPatient?: (appointmentId: number) => void;
  /** External class for positioning */
  className?: string;
  /** Start collapsed */
  defaultCollapsed?: boolean;
}

export function ConsultationQueuePanel({
  currentAppointmentId,
  appointments,
  onSwitchPatient,
  className,
  defaultCollapsed = false,
}: ConsultationQueuePanelProps) {
  const router = useRouter();
  const { user } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);
  const [startingId, setStartingId] = useState<number | null>(null);

  // Filter to only waiting patients (checked in but not in consultation)
  const waitingPatients = appointments.filter(apt => 
    apt.id !== currentAppointmentId &&
    (apt.status === AppointmentStatus.CHECKED_IN || 
     apt.status === AppointmentStatus.READY_FOR_CONSULTATION)
  );

  // Sort by check-in time (oldest first = longest wait)
  const sortedQueue = [...waitingPatients].sort((a, b) => {
    const timeA = a.checkedInAt ? new Date(a.checkedInAt).getTime() : Date.now();
    const timeB = b.checkedInAt ? new Date(b.checkedInAt).getTime() : Date.now();
    return timeA - timeB;
  });

  const queueCount = sortedQueue.length;
  const nextPatient = sortedQueue[0];

  // Handle starting consultation for a patient
  const handleStartConsultation = async (apt: AppointmentResponseDto) => {
    if (!user) return;
    
    setStartingId(apt.id);
    try {
      const response = await doctorApi.startConsultation({
        appointmentId: apt.id,
        doctorId: user.id,
        userId: user.id
      });

      if (response.success) {
        // Notify parent or navigate directly
        if (onSwitchPatient) {
          onSwitchPatient(apt.id);
        } else {
          router.push(`/doctor/consultations/${apt.id}/session`);
        }
        toast.success(`Starting consultation with ${apt.patient?.firstName}`);
      } else {
        toast.error(response.error || 'Failed to start consultation');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to start consultation');
    } finally {
      setStartingId(null);
    }
  };

  // Collapsed view - slim rail with badge
  if (isCollapsed) {
    return (
      <div className={cn("relative hidden lg:block", className)}>
        <button
          onClick={() => setIsCollapsed(false)}
          className={cn(
            "h-full w-10 border-l flex flex-col items-center justify-start pt-4 gap-2 transition-colors",
            queueCount > 0
              ? "bg-emerald-50/80 border-emerald-200 hover:bg-emerald-100/80"
              : "bg-slate-50/50 border-slate-200 hover:bg-slate-100/50",
          )}
        >
          <ChevronLeft className="h-3.5 w-3.5 text-slate-400" />
          <Users className={cn(
            "h-4 w-4",
            queueCount > 0 ? "text-emerald-600" : "text-slate-400",
          )} />
          {queueCount > 0 && (
            <Badge className="bg-emerald-600 text-white text-[10px] h-4 min-w-4 px-1 justify-center">
              {queueCount}
            </Badge>
          )}
          <span className="text-[9px] text-slate-500 font-semibold uppercase tracking-widest [writing-mode:vertical-lr]">
            Queue
          </span>
        </button>
      </div>
    );
  }

  return (
    <div className={cn(
      "w-64 bg-white border-l border-slate-200 flex flex-col h-full hidden lg:flex",
      className
    )}>
      {/* Header */}
      <div className="p-3 border-b border-slate-100 bg-emerald-50/50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-emerald-600" />
          <span className="font-semibold text-sm text-slate-900">Queue</span>
          {queueCount > 0 && (
            <Badge className="bg-emerald-600 text-white text-xs">
              {queueCount}
            </Badge>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsCollapsed(true)}
          className="h-7 w-7 p-0"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Queue Content */}
      <div className="flex-1 overflow-y-auto">
        {queueCount === 0 ? (
          <div className="p-6 text-center">
            <UserCheck className="h-10 w-10 text-slate-300 mx-auto mb-3" />
            <p className="text-sm text-slate-500 font-medium">Queue is clear</p>
            <p className="text-xs text-slate-400 mt-1">No patients waiting</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {sortedQueue.map((apt, index) => {
              const patientName = apt.patient
                ? `${apt.patient.firstName} ${apt.patient.lastName}`
                : 'Unknown';
              const initials = patientName.substring(0, 2).toUpperCase();
              const waitTime = apt.checkedInAt
                ? formatDistanceToNow(new Date(apt.checkedInAt), { addSuffix: false })
                : 'Just arrived';
              const isNext = index === 0;
              const isStarting = startingId === apt.id;

              return (
                <div
                  key={apt.id}
                  className={cn(
                    "p-3 transition-colors",
                    isNext && "bg-emerald-50/50"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Avatar className={cn(
                        "h-10 w-10 border-2",
                        isNext ? "border-emerald-300" : "border-slate-200"
                      )}>
                        <AvatarFallback className={cn(
                          "text-xs font-bold",
                          isNext ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"
                        )}>
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      {isNext && (
                        <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 bg-emerald-500 rounded-full border-2 border-white animate-pulse" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className={cn(
                        "font-semibold text-sm truncate",
                        isNext ? "text-emerald-900" : "text-slate-700"
                      )}>
                        {patientName}
                      </p>
                      <div className="flex items-center gap-1 mt-0.5">
                        <Clock className="h-3 w-3 text-slate-400" />
                        <span className={cn(
                          "text-xs",
                          isNext ? "text-emerald-600 font-medium" : "text-slate-500"
                        )}>
                          {waitTime}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Quick Start Button */}
                  <Button
                    size="sm"
                    onClick={() => handleStartConsultation(apt)}
                    disabled={isStarting}
                    className={cn(
                      "w-full mt-2 h-8 text-xs font-semibold transition-all",
                      isNext 
                        ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm" 
                        : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                    )}
                  >
                    {isStarting ? (
                      <>Starting...</>
                    ) : (
                      <>
                        <Play className="h-3 w-3 mr-1" />
                        {isNext ? 'Start Next' : 'Start'}
                      </>
                    )}
                  </Button>

                  {/* Type badge */}
                  <div className="mt-2">
                    <Badge variant="outline" className="text-[10px] h-5 px-1.5">
                      {apt.type || 'Consultation'}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer - Quick Stats */}
      {queueCount > 0 && (
        <div className="p-3 border-t border-slate-100 bg-slate-50/50">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500">Avg wait</span>
            <span className="font-semibold text-slate-700">
              {getAverageWaitTime(sortedQueue)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// Helper to calculate average wait time
function getAverageWaitTime(appointments: AppointmentResponseDto[]): string {
  if (appointments.length === 0) return '-';
  
  const now = Date.now();
  const totalMinutes = appointments.reduce((sum, apt) => {
    if (!apt.checkedInAt) return sum;
    const waitMs = now - new Date(apt.checkedInAt).getTime();
    return sum + Math.floor(waitMs / 60000);
  }, 0);
  
  const avgMinutes = Math.round(totalMinutes / appointments.length);
  
  if (avgMinutes < 1) return '< 1 min';
  if (avgMinutes === 1) return '1 min';
  return `${avgMinutes} mins`;
}

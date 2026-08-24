'use client';

import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Phone,
  Mail,
  MapPin,
  Calendar,
  User,
  Heart,
  Shield,
  ExternalLink,
  X,
  ChevronRight,
  Pill,
  AlertTriangle,
  ClipboardList,
} from 'lucide-react';
import { format, isToday, isTomorrow } from 'date-fns';
import { calculateAge } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { frontdeskApi } from '@/lib/api/frontdesk';
import { ScheduleProcedureDialog } from '@/components/frontdesk/ScheduleProcedureDialog';
import type { PatientResponseDto } from '@/application/dtos/PatientResponseDto';
import type { AppointmentResponseDto } from '@/application/dtos/AppointmentResponseDto';
import type { ScheduleProcedureResponse } from '@/lib/api/frontdesk';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface PatientDrawerProps {
  patientId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onScheduleSuccess?: (data: ScheduleProcedureResponse) => void;
}

export function PatientDrawer({ patientId, open, onOpenChange, onScheduleSuccess }: PatientDrawerProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [scheduleOpen, setScheduleOpen] = useState(false);

  const { data: patient, isLoading: patientLoading, error } = useQuery({
    queryKey: ['theater-tech', 'patient', patientId],
    queryFn: async () => {
      const result = await frontdeskApi.getPatient(patientId!);
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    enabled: !!patientId && open,
    staleTime: 60_000,
  });

  const { data: appointments, isLoading: appointmentsLoading } = useQuery({
    queryKey: ['theater-tech', 'patient', patientId, 'appointments'],
    queryFn: async () => {
      const result = await frontdeskApi.getPatientAppointments(patientId!);
      if (!result.success) throw new Error(result.error);
      return result.data || [];
    },
    enabled: !!patientId && open,
    staleTime: 30_000,
  });

  const upcomingAppointments = useMemo(() => {
    if (!appointments) return [];
    const today = new Date();
    return appointments
      .filter((apt) => {
        const aptDate = new Date(apt.appointmentDate);
        return aptDate > today && !['CANCELLED', 'NO_SHOW'].includes(apt.status);
      })
      .sort((a, b) => new Date(a.appointmentDate).getTime() - new Date(b.appointmentDate).getTime())
      .slice(0, 5);
  }, [appointments]);

  const patientName = patient ? `${patient.firstName} ${patient.lastName}` : '';

  const resetScroll = () => {
    const el = document.querySelector('[data-patient-drawer-scroll]');
    if (el) el.scrollTop = 0;
  };

  useEffect(() => {
    if (open) {
      resetScroll();
    }
  }, [open, patientId]);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onOpenChange(false);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onOpenChange]);

  const renderContent = () => {
    if (error) {
      return (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="h-12 w-12 rounded-xl border border-[#e7d6bf] bg-[#e7d6bf]/15 flex items-center justify-center mb-3">
            <AlertTriangle className="h-6 w-6 text-[#caa26a]" />
          </div>
          <p className="text-sm font-semibold text-[#2c2e4b]">Failed to load patient</p>
          <p className="text-xs text-[#2c2e4b]/50 mt-1">{String(error)}</p>
        </div>
      );
    }

    if (!patient || patientLoading) {
      return (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Skeleton className="h-12 w-12 rounded-xl bg-[#e7d6bf]/20" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-5 w-40 bg-[#e7d6bf]/15" />
              <Skeleton className="h-3 w-24 bg-[#e7d6bf]/10" />
            </div>
          </div>
          <Separator className="bg-[#e7d6bf]" />
          <div className="space-y-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-4 w-4 bg-[#e7d6bf]/10" />
                <Skeleton className="h-3 w-32 bg-[#e7d6bf]/10" />
              </div>
            ))}
          </div>
        </div>
      );
    }

    const age = patient.dateOfBirth ? calculateAge(new Date(patient.dateOfBirth)) : (patient as any).age ?? null;
    const initials = `${patient.firstName?.[0] || ''}${patient.lastName?.[0] || ''}`;

    return (
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <div className="h-12 w-12 rounded-xl bg-[#e7d6bf]/30 border border-[#e7d6bf] flex items-center justify-center text-[#2c2e4b] font-bold text-sm shrink-0">
            {patient.profileImage ? (
              <img src={patient.profileImage} alt={patientName} className="h-full w-full rounded-xl object-cover" />
            ) : (
              initials
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-bold text-[#2c2e4b] truncate">{patientName}</h3>
            <p className="text-xs text-[#2c2e4b]/50 mt-0.5">
              {patient.fileNumber}
              {age != null && <> · {age} yrs · {patient.gender?.toLowerCase()}</>}
            </p>
          </div>
        </div>

        <Separator className="bg-[#e7d6bf]" />

        <div className="space-y-1.5">
          <Link href={`/theater-tech/patients?q=${encodeURIComponent(patientName)}`}>
            <Button
              variant="outline"
              className="w-full justify-start h-9 rounded-lg border-[#e7d6bf] text-[#2c2e4b] hover:bg-[#e7d6bf]/20 text-xs font-medium"
            >
              <ClipboardList className="h-3.5 w-3.5 mr-2 text-[#caa26a]" />
              Surgical Cases
              <ChevronRight className="h-3.5 w-3.5 ml-auto text-[#2c2e4b]/30" />
            </Button>
          </Link>
          <Button
            variant="outline"
            className="w-full justify-start h-9 rounded-lg border-[#e7d6bf] text-[#2c2e4b] hover:bg-[#e7d6bf]/20 text-xs font-medium"
            onClick={() => setScheduleOpen(true)}
          >
            <Calendar className="h-3.5 w-3.5 mr-2 text-[#caa26a]" />
            Schedule Procedure
            <ChevronRight className="h-3.5 w-3.5 ml-auto text-[#2c2e4b]/30" />
          </Button>
        </div>

        <Separator className="bg-[#e7d6bf]" />

        <div className="space-y-2.5">
          <p className="text-[10px] font-semibold text-[#2c2e4b]/40 uppercase tracking-wider">Contact Information</p>
          {patient.phone && (
            <div className="flex items-center gap-2 text-xs">
              <Phone className="h-3.5 w-3.5 text-[#caa26a]/60 shrink-0" />
              <span className="text-[#2c2e4b]/70">{patient.phone}</span>
            </div>
          )}
          {patient.email && (
            <div className="flex items-center gap-2 text-xs">
              <Mail className="h-3.5 w-3.5 text-[#caa26a]/60 shrink-0" />
              <span className="text-[#2c2e4b]/70 truncate">{patient.email}</span>
            </div>
          )}
          {patient.address && (
            <div className="flex items-center gap-2 text-xs">
              <MapPin className="h-3.5 w-3.5 text-[#caa26a]/60 shrink-0" />
              <span className="text-[#2c2e4b]/70 truncate">{patient.address}</span>
            </div>
          )}
        </div>

        <Separator className="bg-[#e7d6bf]" />

        <div className="space-y-2.5">
          <p className="text-[10px] font-semibold text-[#2c2e4b]/40 uppercase tracking-wider">
            Upcoming Appointments {upcomingAppointments.length > 0 && `(${upcomingAppointments.length})`}
          </p>
          {appointmentsLoading ? (
            <div className="space-y-2">
              {[1, 2].map((i) => (
                <div key={i} className="h-10 bg-[#e7d6bf]/10 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : upcomingAppointments.length === 0 ? (
            <p className="text-xs text-[#2c2e4b]/30">No upcoming appointments</p>
          ) : (
            <div className="space-y-1.5">
              {upcomingAppointments.slice(0, 4).map((apt) => {
                const aptDate = new Date(apt.appointmentDate);
                const isCurrentToday = isToday(aptDate);
                const dateLabel = isCurrentToday ? 'Today' : isTomorrow(aptDate) ? 'Tomorrow' : format(aptDate, 'MMM d');
                return (
                  <div key={apt.id} className="flex items-center justify-between p-2 rounded-lg border border-[#e7d6bf]/60 bg-white">
                    <div className="flex items-center gap-2 min-w-0">
                      <Calendar className="h-3.5 w-3.5 text-[#caa26a] shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-[#2c2e4b] truncate">
                          {dateLabel} {apt.time && `· ${apt.time}`}
                        </p>
                        <p className="text-[10px] text-[#2c2e4b]/50 truncate">
                          {apt.doctor?.name || 'Unassigned'}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  };

  const handleScheduleSuccess = (data: ScheduleProcedureResponse) => {
    setScheduleOpen(false);
    onOpenChange(false);
    onScheduleSuccess?.(data);
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="h-full w-full sm:max-w-[420px] border-l border-[#e7d6bf] bg-white rounded-none">
          <SheetHeader className="px-5 py-4 border-b border-[#e7d6bf] flex items-center justify-between shrink-0">
            <div>
              <SheetTitle className="text-sm font-bold text-[#2c2e4b]">Patient Details</SheetTitle>
              {patient && !patientLoading && (
                <SheetDescription className="text-xs text-[#2c2e4b]/50 mt-0.5">
                  {patient.fileNumber}
                </SheetDescription>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              className="h-8 w-8 rounded-lg hover:bg-[#e7d6bf]/30 text-[#2c2e4b]/40"
            >
              <X className="h-4 w-4" />
            </Button>
          </SheetHeader>

          <div
            data-patient-drawer-scroll
            className="flex-1 overflow-y-auto px-5 py-4 scroll-smooth overscroll-contain"
          >
            {renderContent()}
          </div>
        </SheetContent>
      </Sheet>

      <ScheduleProcedureDialog
        open={scheduleOpen}
        onOpenChange={setScheduleOpen}
        initialPatient={patient}
        onSuccess={handleScheduleSuccess}
      />
    </>
  );
}

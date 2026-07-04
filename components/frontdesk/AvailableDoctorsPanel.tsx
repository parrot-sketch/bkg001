'use client';

/**
 * Available Doctors Panel
 * 
 * Displays doctor availability for today with consistent branding.
 * Designed for the frontdesk dashboard as a primary action surface.
 * 
 * Branded with Nairobi Sculpt light palette: white cards, beige borders,
 * navy typography, and gold accents.
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Clock,
  User,
  CheckCircle2,
  Stethoscope,
  RefreshCw,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/patient/useAuth';
import { DoctorAvailabilityResponseDto } from '@/application/dtos/DoctorAvailabilityResponseDto';
import { useDoctorsAvailability, getDefaultAvailabilityDateRange } from '@/hooks/schedule/useDoctorAvailability';
import { useBookAppointmentStore } from '@/hooks/frontdesk/useBookAppointmentStore';
import { AppointmentSource } from '@/domain/enums/AppointmentSource';
import { BookingChannel } from '@/domain/enums/BookingChannel';

// Extended type for doctor availability with optional UI properties
interface DoctorAvailabilityWithUI extends DoctorAvailabilityResponseDto {
  colorCode?: string;
  email?: string;
  phone?: string;
}

interface AvailableDoctorsPanelProps {
  selectedDate?: Date;
}

export function AvailableDoctorsPanel({ selectedDate }: AvailableDoctorsPanelProps) {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const { openBookingDialog } = useBookAppointmentStore();
  const [viewDate] = useState(selectedDate || new Date());

  // Get default date range (next 2 months) - matches booking wizard
  const { startDate, endDate } = getDefaultAvailabilityDateRange();
  
  // Use shared hook - data will be cached and reused by booking wizard
  const {
    data: allDoctors = [],
    isLoading: loading,
    refetch,
    isRefetching,
  } = useDoctorsAvailability(startDate, endDate, {
    enabled: !!isAuthenticated && !!user && !authLoading,
  });

  // Filter to only show doctors who have at least one available date in the future
  const doctorsAvailability = allDoctors.filter((doctor) => {
    return doctor.workingDays && doctor.workingDays.some((wd) => wd.isAvailable);
  }) as DoctorAvailabilityWithUI[];

  // Navigate to canonical booking page with doctor pre-selected
  const handleQuickBook = (doctor: DoctorAvailabilityWithUI) => {
    openBookingDialog({
      initialDoctorId: doctor.doctorId,
      source: AppointmentSource.FRONTDESK_SCHEDULED,
      bookingChannel: BookingChannel.DASHBOARD,
    });
  };

  if (authLoading || loading) {
    return <AvailableDoctorsSkeleton />;
  }

  if (!isAuthenticated || !user) return null;

  return (
    <Card className="h-full flex flex-col border border-[#e7d6bf] bg-white rounded-xl overflow-hidden shadow-sm">
      {/* ── Header ── */}
      <div className="px-4 py-3 border-b border-[#e7d6bf] bg-white flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 border border-[#e7d6bf] bg-[#e7d6bf]/30 flex items-center justify-center">
            <Stethoscope className="h-4 w-4 text-[#caa26a]" />
          </div>
          <div>
            <CardTitle className="text-sm font-semibold text-[#2c2e4b]">
              Available Doctors
            </CardTitle>
            <p className="text-[10px] text-[#2c2e4b]/60 font-medium mt-0.5">
              {doctorsAvailability.length} doctor{doctorsAvailability.length !== 1 ? 's' : ''} on duty today
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => refetch()}
          disabled={isRefetching}
          className="h-8 px-2.5 text-xs text-[#2c2e4b]/50 hover:text-[#2c2e4b] rounded-lg"
        >
          <RefreshCw className={cn('h-3.5 w-3.5 mr-1.5', isRefetching && 'animate-spin')} />
          Refresh
        </Button>
      </div>

      {/* ── Doctor List ── */}
      <CardContent className="p-0 flex-1 overflow-y-auto">
        {doctorsAvailability.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center px-5">
            <div className="h-12 w-12 border border-[#e7d6bf] bg-[#e7d6bf]/20 flex items-center justify-center mb-3">
              <User className="h-6 w-6 text-[#2c2e4b]/30" />
            </div>
            <p className="text-sm font-semibold text-[#2c2e4b] mb-1">No Doctors Available</p>
            <p className="text-xs text-[#2c2e4b]/50">No doctors have availability in the next 2 months</p>
          </div>
        ) : (
          <div className="divide-y divide-[#e7d6bf]/60">
            {doctorsAvailability.map((doctor: DoctorAvailabilityWithUI, index: number) => {
              // Find the first available working day (could be today or future)
              const availableWorkDay = doctor.workingDays.find((wd) => wd.isAvailable);

              return (
                <div
                  key={doctor.doctorId}
                  className={cn(
                    'group relative px-4 py-3 hover:bg-[#e7d6bf]/10 transition-all duration-200 cursor-pointer',
                    index === 0 && 'pt-3'
                  )}
                  onClick={() => handleQuickBook(doctor)}
                >
                  <div className="flex items-center gap-3">
                    {/* Avatar */}
                    <div className="relative shrink-0">
                      <div className="h-10 w-10 rounded-lg border border-[#e7d6bf] bg-[#e7d6bf]/30 flex items-center justify-center text-[#2c2e4b] font-semibold text-sm transition-transform group-hover:scale-105 duration-200">
                        {doctor.doctorName.split(' ').slice(-1)[0]?.charAt(0) || 'D'}
                      </div>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <h4 className="font-semibold text-sm text-[#2c2e4b] truncate leading-tight">
                          {doctor.doctorName}
                        </h4>
                      </div>
                      <p className="text-xs text-[#2c2e4b]/60 truncate mb-1.5">
                        {doctor.specialization}
                      </p>

                      {/* Status row */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge
                          variant="outline"
                          className="rounded-none text-[10px] border-[#e7d6bf] bg-[#e7d6bf]/20 text-[#2c2e4b] font-semibold px-2 py-0"
                        >
                          <CheckCircle2 className="w-3 h-3 mr-1 text-[#caa26a]" />
                          On Duty
                        </Badge>
                        {availableWorkDay && (
                          <span className="text-[10px] text-[#2c2e4b]/50 flex items-center font-medium">
                            <Clock className="w-3 h-3 mr-1 text-[#caa26a]/60" />
                            {availableWorkDay.startTime} – {availableWorkDay.endTime}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Quick Book button */}
                    <Button
                      size="sm"
                      className={cn(
                        'transition-all duration-200 shrink-0 rounded-lg shadow-sm border border-transparent',
                        'bg-[#caa26a] hover:bg-[#b8913e] text-[#2c2e4b]',
                        'opacity-100 sm:opacity-0 sm:translate-x-1 sm:group-hover:opacity-100 sm:group-hover:translate-x-0'
                      )}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleQuickBook(doctor);
                      }}
                    >
                      <Stethoscope className="h-3.5 w-3.5 mr-1.5" />
                      Book
                      <ChevronRight className="h-3 w-3 ml-1" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ═══════════════════════ Helpers ═══════════════════════ */

function AvailableDoctorsSkeleton() {
  return (
    <Card className="h-full border border-[#e7d6bf] bg-white rounded-xl overflow-hidden shadow-sm">
      <CardHeader className="px-4 py-3 border-b border-[#e7d6bf] bg-white">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 border border-[#e7d6bf] bg-[#e7d6bf]/20" />
          <div className="space-y-1.5">
            <div className="h-4 w-32 bg-[#e7d6bf]/20 rounded" />
            <div className="h-3 w-24 bg-[#e7d6bf]/10 rounded" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4">
        <div className="space-y-5">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg border border-[#e7d6bf]/40 bg-[#e7d6bf]/10" />
              <div className="space-y-2 flex-1">
                <div className="h-4 w-3/4 bg-[#e7d6bf]/15 rounded" />
                <div className="h-3 w-1/2 bg-[#e7d6bf]/10 rounded" />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

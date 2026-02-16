'use client';

/**
 * Available Doctors Panel — Premium Redesign
 * 
 * Displays doctor availability for today with gradient avatars,
 * live status indicators, and seamless Quick Book integration.
 * Designed for the frontdesk dashboard as a primary action surface.
 */

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Calendar,
  Clock,
  User,
  CheckCircle2,
  Stethoscope,
  ArrowRight,
  RefreshCw,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { frontdeskApi } from '@/lib/api/frontdesk';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/patient/useAuth';
import { QuickBookingDialog } from './QuickBookingDialog';
import { DoctorResponseDto } from '@/application/dtos/DoctorResponseDto';
import { DoctorAvailabilityResponseDto } from '@/application/dtos/DoctorAvailabilityResponseDto';

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
  const queryClient = useQueryClient();
  const router = useRouter();
  const [viewDate] = useState(selectedDate || new Date());

  // State for Quick Booking Dialog
  const [selectedDoctor, setSelectedDoctor] = useState<DoctorResponseDto | null>(null);
  const [isQuickBookOpen, setIsQuickBookOpen] = useState(false);

  // Fetch doctor availability for today
  const {
    data: doctorsAvailability = [],
    isLoading: loading,
    refetch,
    isRefetching,
  } = useQuery<DoctorAvailabilityWithUI[]>({
    queryKey: ['doctors', 'availability', 'today', viewDate.toISOString().split('T')[0]],
    queryFn: async (): Promise<DoctorAvailabilityWithUI[]> => {
      const startOfDay = new Date(viewDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(viewDate);
      endOfDay.setHours(23, 59, 59, 999);

      const response = await frontdeskApi.getDoctorsAvailability(startOfDay, endOfDay);

      if (!response.success) {
        if (response.error && !response.error.includes('Authentication')) {
          toast.error(response.error || 'Failed to load doctor list');
        }
        return [];
      }
      return (response.data || []) as DoctorAvailabilityWithUI[];
    },
    enabled: !!isAuthenticated && !!user && !authLoading,
    staleTime: 1000 * 60 * 5,
  });

  // Handle "Quick Book" click
  const handleQuickBook = (doctor: DoctorAvailabilityWithUI) => {
    const nameParts = doctor.doctorName.split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    const doctorDto: DoctorResponseDto = {
      id: doctor.doctorId,
      name: doctor.doctorName,
      firstName,
      lastName,
      specialization: doctor.specialization,
      email: doctor.email || '',
      phone: doctor.phone || '',
      licenseNumber: '',
      address: '',
      bio: '',
      colorCode: doctor.colorCode,
    };

    setSelectedDoctor(doctorDto);
    setIsQuickBookOpen(true);
  };

  if (authLoading || loading) {
    return <AvailableDoctorsSkeleton />;
  }

  if (!isAuthenticated || !user) return null;

  return (
    <>
      <Card className="h-full flex flex-col border-slate-200/60 shadow-sm rounded-2xl overflow-hidden">
        {/* ── Header ── */}
        <CardHeader className="py-3.5 px-5 border-b border-slate-100 bg-gradient-to-r from-slate-50/80 to-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-cyan-500 to-cyan-600 shadow-sm shadow-cyan-200/50">
                <Stethoscope className="h-4 w-4 text-white" />
              </div>
              <div>
                <CardTitle className="text-sm font-bold text-slate-800 tracking-tight">
                  Available Doctors
                </CardTitle>
                <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                  {doctorsAvailability.length} doctor{doctorsAvailability.length !== 1 ? 's' : ''} on duty today
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => refetch()}
              disabled={isRefetching}
              className="h-8 px-2.5 text-xs text-slate-400 hover:text-slate-600 rounded-lg"
            >
              <RefreshCw className={cn('h-3.5 w-3.5 mr-1.5', isRefetching && 'animate-spin')} />
              Refresh
            </Button>
          </div>
        </CardHeader>

        {/* ── Doctor List ── */}
        <CardContent className="p-0 flex-1 overflow-y-auto">
          {doctorsAvailability.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center px-6">
              <div className="h-16 w-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
                <User className="h-8 w-8 text-slate-300" />
              </div>
              <p className="text-sm font-semibold text-slate-600 mb-1">No Doctors Available</p>
              <p className="text-xs text-slate-400">No doctors have set availability for today</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100/80">
              {doctorsAvailability.map((doctor: DoctorAvailabilityWithUI, index: number) => {
                const todayWork = doctor.workingDays.find((wd) => wd.isAvailable);
                const color = doctor.colorCode || '#0891b2';

                return (
                  <div
                    key={doctor.doctorId}
                    className={cn(
                      'group relative px-5 py-4 hover:bg-slate-50/70 transition-all duration-200 cursor-pointer',
                      index === 0 && 'pt-4'
                    )}
                    onClick={() => handleQuickBook(doctor)}
                  >
                    {/* Left accent on hover */}
                    <div
                      className="absolute left-0 top-0 bottom-0 w-[3px] rounded-r-full opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                      style={{ backgroundColor: color }}
                    />

                    <div className="flex items-center gap-4">
                      {/* Avatar */}
                      <div className="relative shrink-0">
                        <div
                          className="h-12 w-12 rounded-xl flex items-center justify-center text-white font-bold text-base shadow-sm transition-transform group-hover:scale-105 duration-200"
                          style={{
                            background: `linear-gradient(135deg, ${color} 0%, ${adjustColor(color, -25)} 100%)`,
                          }}
                        >
                          {doctor.doctorName.split(' ').slice(-1)[0]?.charAt(0) || 'D'}
                        </div>
                        {/* Live indicator */}
                        <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-emerald-500 ring-2 ring-white shadow-sm" />
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <h4 className="font-semibold text-sm text-slate-800 truncate leading-tight">
                            {doctor.doctorName}
                          </h4>
                        </div>
                        <p className="text-xs text-slate-500 truncate mb-2">
                          {doctor.specialization}
                        </p>

                        {/* Status row */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge
                            variant="secondary"
                            className="bg-emerald-50 text-emerald-700 border-emerald-200/60 text-[10px] font-semibold px-2 py-0 rounded-md"
                          >
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            On Duty
                          </Badge>
                          {todayWork && (
                            <span className="text-[10px] text-slate-400 flex items-center font-medium">
                              <Clock className="w-3 h-3 mr-1" />
                              {todayWork.startTime} – {todayWork.endTime}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Quick Book button */}
                      <Button
                        size="sm"
                        className={cn(
                          'transition-all duration-200 shrink-0 rounded-xl shadow-sm',
                          'bg-cyan-600 hover:bg-cyan-700 text-white',
                          'opacity-0 group-hover:opacity-100 translate-x-1 group-hover:translate-x-0'
                        )}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleQuickBook(doctor);
                        }}
                      >
                        <Zap className="h-3.5 w-3.5 mr-1.5" />
                        Quick Book
                        <ArrowRight className="h-3 w-3 ml-1" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Booking Dialog */}
      {selectedDoctor && (
        <QuickBookingDialog
          doctor={selectedDoctor}
          open={isQuickBookOpen}
          onOpenChange={setIsQuickBookOpen}
          onSuccess={(appointmentId, date) => {
            refetch();
            queryClient.invalidateQueries({ queryKey: ['frontdesk', 'schedule'] });
            if (appointmentId) {
              let url = `/frontdesk/appointments?highlight=${appointmentId}`;
              if (date) {
                url += `&date=${format(date, 'yyyy-MM-dd')}`;
              }
              router.push(url);
            }
          }}
        />
      )}
    </>
  );
}

/* ═══════════════════════ Helpers ═══════════════════════ */

/** Darken/lighten a hex color */
function adjustColor(color: string, amount: number): string {
  const clamp = (val: number) => Math.min(255, Math.max(0, val));
  let hex = color.replace('#', '');
  if (hex.length === 3) hex = hex.split('').map((c) => c + c).join('');
  const num = parseInt(hex, 16);
  const r = clamp((num >> 16) + amount);
  const g = clamp(((num >> 8) & 0x00ff) + amount);
  const b = clamp((num & 0x0000ff) + amount);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

function AvailableDoctorsSkeleton() {
  return (
    <Card className="h-full border-slate-200/60 shadow-sm rounded-2xl overflow-hidden">
      <CardHeader className="py-3.5 px-5 border-b border-slate-100 bg-gradient-to-r from-slate-50/80 to-white">
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-9 rounded-xl" />
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-5">
        <div className="space-y-5">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-4">
              <Skeleton className="h-12 w-12 rounded-xl" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
                <div className="flex gap-2">
                  <Skeleton className="h-5 w-16 rounded-md" />
                  <Skeleton className="h-5 w-24 rounded-md" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

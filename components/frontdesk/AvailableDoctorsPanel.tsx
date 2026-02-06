'use client';

/**
 * Available Doctors Panel Component - REDESIGNED
 * 
 * Clean, modern list layout showcasing doctor availability for TODAY.
 * Features "Quick Book" to directly open streamlined booking dialog.
 * Enhanced UI with better visual hierarchy and spacing.
 */

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, User, CheckCircle2, Stethoscope, ArrowRight, RefreshCw } from 'lucide-react';
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
  const [viewDate] = useState(selectedDate || new Date());

  // State for Quick Booking Dialog
  const [selectedDoctor, setSelectedDoctor] = useState<DoctorResponseDto | null>(null);
  const [isQuickBookOpen, setIsQuickBookOpen] = useState(false);


  // 1. Fetch BASIC Doctor List (Lightweight)
  // We only fetch "Today's" availability to show the initial status badges
  const {
    data: doctorsAvailability = [],
    isLoading: loading,
    refetch,
    isRefetching
  } = useQuery<DoctorAvailabilityWithUI[]>({
    queryKey: ['doctors', 'availability', 'today', viewDate.toISOString().split('T')[0]],
    queryFn: async (): Promise<DoctorAvailabilityWithUI[]> => {
      // Create a range of just ONE day (Today)
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


  // 2. Handle "Quick Book" Click
  const handleQuickBook = (doctor: DoctorAvailabilityWithUI) => {
    // Extract name parts for firstName/lastName
    const nameParts = doctor.doctorName.split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    // Convert the doctor data to DoctorResponseDto format
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
      <Card className="h-full flex flex-col border-slate-200/60 shadow-sm rounded-xl overflow-hidden">
        <CardHeader className="py-3 px-4 border-b border-slate-100 bg-slate-50/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-cyan-100">
                <Stethoscope className="h-4 w-4 text-cyan-600" />
              </div>
              <div>
                <CardTitle className="text-sm font-semibold text-slate-800">
                  Available Doctors
                </CardTitle>
                <p className="text-[10px] text-slate-500 font-medium">
                  Scheduled for today • Click to book
                </p>
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => refetch()}
              disabled={isRefetching}
              className="h-8 px-2 text-xs text-slate-500 hover:text-slate-700"
            >
              <RefreshCw className={cn("h-3.5 w-3.5 mr-1.5", isRefetching && "animate-spin")} />
              Refresh
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-0 flex-1 overflow-y-auto">
          {doctorsAvailability.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center px-6">
              <div className="h-14 w-14 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                <User className="h-7 w-7 text-slate-300" />
              </div>
              <p className="text-sm font-medium text-slate-700 mb-1">No Doctors Available</p>
              <p className="text-xs text-slate-500">No doctors are scheduled for today</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {doctorsAvailability.map((doctor: DoctorAvailabilityWithUI, index: number) => {
                // Check if actually working today based on the single-day query result
                const todayWork = doctor.workingDays.find((wd) => wd.isAvailable);

                return (
                  <div 
                    key={doctor.doctorId} 
                    className={cn(
                      "p-4 hover:bg-slate-50/80 transition-all duration-200 group cursor-pointer",
                      index === 0 && "pt-5"
                    )}
                    onClick={() => handleQuickBook(doctor)}
                  >
                    <div className="flex items-center gap-4">
                      {/* Avatar with gradient */}
                      <div className="relative">
                        <div 
                          className="h-12 w-12 rounded-full flex items-center justify-center text-white font-bold text-base shadow-sm"
                          style={{ 
                            background: `linear-gradient(135deg, ${doctor.colorCode || '#0891b2'} 0%, ${adjustColor(doctor.colorCode || '#0891b2', -20)} 100%)` 
                          }}
                        >
                          {doctor.doctorName.split(' ').slice(-1)[0]?.charAt(0) || 'D'}
                        </div>
                        {/* Online indicator */}
                        <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-white" />
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <h4 className="font-semibold text-sm text-slate-800 truncate">
                            {doctor.doctorName}
                          </h4>
                        </div>
                        <p className="text-xs text-slate-500 truncate mb-1.5">
                          {doctor.specialization}
                        </p>

                        {/* Status Badges */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge 
                            variant="secondary" 
                            className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-medium px-2 py-0"
                          >
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            On Duty
                          </Badge>
                          {todayWork && (
                            <span className="text-[10px] text-slate-400 flex items-center">
                              <Clock className="w-3 h-3 mr-1" />
                              {todayWork.startTime} - {todayWork.endTime}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Action Button */}
                      <Button
                        size="sm"
                        className={cn(
                          "transition-all duration-200 shadow-sm",
                          "bg-cyan-600 hover:bg-cyan-700 text-white",
                          "opacity-0 group-hover:opacity-100 translate-x-2 group-hover:translate-x-0"
                        )}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleQuickBook(doctor);
                        }}
                      >
                        <Calendar className="h-3.5 w-3.5 mr-1.5" />
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
          onSuccess={() => {
            refetch(); // Refresh the doctors list
            queryClient.invalidateQueries({ queryKey: ['frontdesk', 'schedule'] }); // Refresh the schedule
            toast.success('Appointment booked successfully!');
          }}
        />
      )}
    </>
  );
}

// Helper to darken/lighten a hex color
function adjustColor(color: string, amount: number): string {
  const clamp = (val: number) => Math.min(255, Math.max(0, val));
  
  let hex = color.replace('#', '');
  if (hex.length === 3) {
    hex = hex.split('').map(c => c + c).join('');
  }
  
  const num = parseInt(hex, 16);
  const r = clamp((num >> 16) + amount);
  const g = clamp(((num >> 8) & 0x00FF) + amount);
  const b = clamp((num & 0x0000FF) + amount);
  
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

function AvailableDoctorsSkeleton() {
  return (
    <Card className="h-full border-slate-200/60 shadow-sm rounded-xl overflow-hidden">
      <CardHeader className="py-3 px-4 border-b border-slate-100 bg-slate-50/30">
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-8 rounded-lg" />
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4">
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-4">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
                <div className="flex gap-2">
                  <Skeleton className="h-5 w-16 rounded-full" />
                  <Skeleton className="h-5 w-24 rounded-full" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

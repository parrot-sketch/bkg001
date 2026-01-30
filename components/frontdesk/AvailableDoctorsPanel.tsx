'use client';

/**
 * Available Doctors Panel Component - REDESIGNED
 * 
 * Modern card-based layout showcasing doctor availability
 * with quick actions and visual scheduling indicators.
 * 
 * Design changes:
 * - Removed list layout, replaced with responsive grid
 * - Highlighted availability with color-coded badges
 * - Quick "Book" action directly accessible
 * - Week view compact display instead of horizontal scroll
 * - Mobile optimized without shrinking
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button, buttonVariants } from '@/components/ui/button';
import { Calendar, Clock, User, MapPin, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { frontdeskApi } from '@/lib/api/frontdesk';
import { toast } from 'sonner';
import { format } from 'date-fns';
import type { DoctorAvailabilityResponseDto } from '@/application/dtos/DoctorAvailabilityResponseDto';
import { ProfileImage } from '@/components/profile-image';
import { useAuth } from '@/hooks/patient/useAuth';

interface AvailableDoctorsPanelProps {
  selectedDate?: Date;
}

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const DAY_ABBREVIATIONS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

export function AvailableDoctorsPanel({ selectedDate }: AvailableDoctorsPanelProps) {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [viewDate, setViewDate] = useState(selectedDate || new Date());

  // React Query integration
  const {
    data: doctorsAvailability = [],
    isLoading: loading,
    refetch
  } = useQuery({
    queryKey: ['doctors', 'availability', viewDate.toISOString().split('T')[0]],
    queryFn: async () => {
      // Get availability for the week containing the selected date
      const startOfWeek = new Date(viewDate);
      startOfWeek.setDate(viewDate.getDate() - viewDate.getDay() + 1); // Monday
      startOfWeek.setHours(0, 0, 0, 0);

      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6); // Sunday
      endOfWeek.setHours(23, 59, 59, 999);

      const response = await frontdeskApi.getDoctorsAvailability(startOfWeek, endOfWeek);

      if (!response.success) {
        // Only show error toast if it's not an authentication error (401)
        if (response.error && !response.error.includes('Authentication')) {
          toast.error(response.error || 'Failed to load doctor availability');
        }
        return [];
      }
      return response.data || [];
    },
    enabled: !!isAuthenticated && !!user && !authLoading,
    staleTime: 1000 * 60 * 5, // 5 minutes cache
    gcTime: 1000 * 60 * 10,
    retry: 1,
    refetchOnWindowFocus: true,
  });

  const getWorkingDayForDate = (doctor: DoctorAvailabilityResponseDto, date: Date) => {
    const dayName = DAYS_OF_WEEK[date.getDay() === 0 ? 6 : date.getDay() - 1]; // Convert to Monday=0
    return doctor.workingDays.find(
      (wd) => wd.day.toLowerCase() === dayName.toLowerCase() && wd.isAvailable
    );
  };

  const isAvailableToday = (doctor: DoctorAvailabilityResponseDto) => {
    const today = new Date();
    const workingDay = getWorkingDayForDate(doctor, today);
    return !!workingDay;
  };

  // Show loading state while auth is loading or data is loading
  if (authLoading || loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Doctors</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Don't show anything if not authenticated (parent component handles auth UI)
  if (!isAuthenticated || !user) {
    return null;
  }

  if (doctorsAvailability.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Doctors</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-sm text-muted-foreground">No doctors available</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Calendar className="h-5 w-5 text-muted-foreground" />
            Available Doctors
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => refetch()}
            className="h-8 px-2"
          >
            Refresh
          </Button>
        </div>
        <CardDescription className="text-xs">
          Click a doctor to book an appointment
        </CardDescription>
      </CardHeader>
      <CardContent className="pb-6 pt-0">
        <div className="max-h-[680px] overflow-y-auto scrollbar-hide pr-1 -mr-1">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4 pt-4">
            {doctorsAvailability.map((doctor) => {
              const availableToday = isAvailableToday(doctor);
              const todayWorkingDay = getWorkingDayForDate(doctor, new Date());

              return (
                <div
                  key={doctor.doctorId}
                  className="border rounded-lg p-4 hover:shadow-md hover:border-primary/50 transition-all group"
                >
                  {/* Doctor Header */}
                  <div className="flex items-start gap-4 mb-3">
                    {/* Avatar */}
                    <div className="flex-shrink-0">
                      <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent flex items-center justify-center border border-primary/10 shadow-sm overflow-hidden">
                        <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                        <User className="h-7 w-7 text-primary/70" />
                      </div>
                    </div>

                    {/* Info & Status */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col gap-0.5">
                        <h3 className="font-bold text-base text-foreground group-hover:text-primary transition-colors line-clamp-1" title={doctor.doctorName}>
                          {doctor.doctorName}
                        </h3>
                        <div className="flex flex-wrap items-center gap-2">
                          <p
                            className="text-xs text-muted-foreground line-clamp-1 font-medium flex-1 min-w-[80px]"
                            title={doctor.specialization}
                          >
                            {doctor.specialization}
                          </p>
                          {availableToday && (
                            <span className="px-2 py-0.5 text-[9px] font-bold rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 whitespace-nowrap border border-emerald-200/50 dark:border-emerald-800/50 uppercase tracking-wider">
                              Today
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Today's Hours */}
                      {todayWorkingDay && (
                        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground/80 mt-2 font-medium">
                          <div className="flex items-center justify-center w-5 h-5 rounded-full bg-muted/50">
                            <Clock className="h-3 w-3" />
                          </div>
                          <span>Today: {todayWorkingDay.startTime} - {todayWorkingDay.endTime}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Weekly Availability Grid - Refined */}
                  <div className="mt-4 p-2.5 bg-muted/20 rounded-xl border border-border/40">
                    <div className="grid grid-cols-7 gap-1">
                      {DAYS_OF_WEEK.map((dayName, index) => {
                        const workingDay = doctor.workingDays.find(
                          (wd) => wd.day.toLowerCase() === dayName.toLowerCase() && wd.isAvailable
                        );
                        const isToday = new Date().getDay() === (index + 1) % 7;

                        return (
                          <div
                            key={dayName}
                            className={`flex flex-col items-center justify-center py-2 px-1 rounded-lg text-xs font-medium transition-all ${workingDay
                              ? isToday
                                ? 'bg-primary shadow-sm scale-105 z-10 text-primary-foreground'
                                : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/30'
                              : 'bg-muted/40 text-muted-foreground/30'
                              }`}
                            title={workingDay ? `${dayName}: ${workingDay.startTime} - ${workingDay.endTime}` : `${dayName}: Off`}
                          >
                            <div className="font-bold text-[10px] uppercase tracking-tighter">{DAY_ABBREVIATIONS[index]}</div>
                            {workingDay && (
                              <div className="text-[8px] mt-0.5 font-bold opacity-90">
                                {workingDay.startTime.split(':')[0]}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Action Button */}
                  <Link
                    href={`/frontdesk/appointments/new?doctorId=${doctor.doctorId}`}
                    className={cn(
                      buttonVariants({ variant: 'default', size: 'sm' }),
                      "w-full mt-4 h-10 group/btn font-semibold shadow-sm hover:shadow-md transition-all rounded-lg"
                    )}
                  >
                    Book Appointment
                    <ChevronRight className="h-4 w-4 ml-2 group-hover/btn:translate-x-1 transition-transform" />
                  </Link>
                </div>
              );
            })}
          </div>

          {/* Empty State */}
          {doctorsAvailability.length === 0 && !loading && (
            <div className="text-center py-12">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                <User className="h-8 w-8 text-muted-foreground/50" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">No doctors available</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

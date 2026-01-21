'use client';

/**
 * Available Doctors Panel Component
 * 
 * Displays available doctors with their schedules for front desk users.
 * Shows weekly availability and helps front desk staff schedule appointments.
 */

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, User, MapPin } from 'lucide-react';
import { frontdeskApi } from '@/lib/api/frontdesk';
import { toast } from 'sonner';
import { format } from 'date-fns';
import type { DoctorAvailabilityResponseDto } from '@/application/dtos/DoctorAvailabilityResponseDto';
import { ProfileImage } from '@/components/profile-image';

interface AvailableDoctorsPanelProps {
  selectedDate?: Date;
}

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const DAY_ABBREVIATIONS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function AvailableDoctorsPanel({ selectedDate }: AvailableDoctorsPanelProps) {
  const [doctorsAvailability, setDoctorsAvailability] = useState<DoctorAvailabilityResponseDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewDate, setViewDate] = useState(selectedDate || new Date());

  useEffect(() => {
    loadDoctorsAvailability();
  }, [viewDate]);

  const loadDoctorsAvailability = async () => {
    try {
      setLoading(true);
      // Get availability for the week containing the selected date
      const startOfWeek = new Date(viewDate);
      startOfWeek.setDate(viewDate.getDate() - viewDate.getDay() + 1); // Monday
      startOfWeek.setHours(0, 0, 0, 0);

      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6); // Sunday
      endOfWeek.setHours(23, 59, 59, 999);

      const response = await frontdeskApi.getDoctorsAvailability(startOfWeek, endOfWeek);

      if (response.success && response.data) {
        setDoctorsAvailability(response.data);
      } else if (!response.success) {
        toast.error(response.error || 'Failed to load doctor availability');
        setDoctorsAvailability([]);
      }
    } catch (error) {
      toast.error('An error occurred while loading doctor availability');
      console.error('Error loading doctor availability:', error);
      setDoctorsAvailability([]);
    } finally {
      setLoading(false);
    }
  };

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

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Available Doctors</CardTitle>
          <CardDescription>Doctor availability and schedules</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (doctorsAvailability.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Available Doctors</CardTitle>
          <CardDescription>Doctor availability and schedules</CardDescription>
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
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Available Doctors</CardTitle>
            <CardDescription>Doctor availability and schedules for scheduling</CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={loadDoctorsAvailability}
          >
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {doctorsAvailability.map((doctor) => {
            const availableToday = isAvailableToday(doctor);
            const todayWorkingDay = getWorkingDayForDate(doctor, new Date());

            return (
              <div
                key={doctor.doctorId}
                className="border rounded-lg p-4 hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-start gap-4">
                  {/* Doctor Avatar */}
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="h-6 w-6 text-primary" />
                    </div>
                  </div>

                  {/* Doctor Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <h3 className="font-semibold text-foreground">{doctor.doctorName}</h3>
                        <p className="text-sm text-muted-foreground">{doctor.specialization}</p>
                      </div>
                      {availableToday && (
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                          Available Today
                        </span>
                      )}
                    </div>

                    {/* Today's Hours */}
                    {todayWorkingDay && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                        <Clock className="h-4 w-4" />
                        <span>
                          Today: {todayWorkingDay.startTime} - {todayWorkingDay.endTime}
                        </span>
                      </div>
                    )}

                    {/* Weekly Schedule */}
                    <div className="mt-3">
                      <p className="text-xs font-medium text-muted-foreground mb-2">Weekly Schedule:</p>
                      <div className="grid grid-cols-7 gap-1">
                        {DAYS_OF_WEEK.map((dayName, index) => {
                          const workingDay = doctor.workingDays.find(
                            (wd) => wd.day.toLowerCase() === dayName.toLowerCase() && wd.isAvailable
                          );
                          return (
                            <div
                              key={dayName}
                              className={`text-center p-2 rounded text-xs ${
                                workingDay
                                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                  : 'bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-600'
                              }`}
                              title={workingDay ? `${dayName}: ${workingDay.startTime} - ${workingDay.endTime}` : `${dayName}: Not Available`}
                            >
                              <div className="font-medium">{DAY_ABBREVIATIONS[index]}</div>
                              {workingDay && (
                                <div className="text-[10px] mt-1">
                                  {workingDay.startTime.slice(0, 5)}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="mt-6 pt-4 border-t flex items-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-green-100 dark:bg-green-900/30"></div>
            <span>Available</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-gray-100 dark:bg-gray-800"></div>
            <span>Not Available</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

'use client';

import { useMemo, useState } from 'react';
import { useAuth } from '@/hooks/patient/useAuth';
import { useDoctorTodayAppointments } from '@/hooks/doctor/useDoctorDashboard';
import { AppointmentAnalytics } from '@/components/doctor/appointments/AppointmentAnalytics';
import { AppointmentTable } from '@/components/doctor/appointments/AppointmentTable';
import { DatePicker } from '@/components/ui/date-picker';
import { CalendarIcon, RefreshCw } from 'lucide-react';
import { format, startOfDay, endOfDay } from 'date-fns';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export default function DoctorAppointmentsPage() {
  const { user, isAuthenticated } = useAuth();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  const {
    data: appointmentData,
    isLoading,
    isRefetching,
    refetch,
  } = useDoctorTodayAppointments(user?.id, isAuthenticated && !!user, false, selectedDate);

  const appointments = useMemo(() => appointmentData || [], [appointmentData]);

  const handleDateChange = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date);
    }
  };

  const goToToday = () => {
    setSelectedDate(new Date());
  };

  if (!isAuthenticated || !user) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#f0f4f5]">
        <p className="text-sm text-slate-400">Please log in</p>
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-in fade-in duration-500">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">Appointments</h1>
          <p className="text-sm text-white/70 mt-0.5">
            {format(selectedDate, 'EEEE, MMMM d, yyyy')}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <DatePicker
            value={selectedDate}
            onChange={handleDateChange}
            maxDate={endOfDay(new Date())}
            className={cn(
              'w-auto h-10 px-3 py-2 text-sm border border-[#e7d6bf] rounded-lg',
              'bg-white text-[#2c2e4b] hover:bg-[#e7d6bf]/10',
              'focus:ring-2 focus:ring-[#caa26a]/30 focus:border-[#caa26a]'
            )}
          />

          <Button
            variant="outline"
            onClick={goToToday}
            className={cn(
              'h-10 px-3 text-sm border border-[#e7d6bf] rounded-lg',
              'bg-white text-[#2c2e4b] hover:bg-[#e7d6bf]/10'
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            Today
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => refetch()}
            disabled={isRefetching}
            className={cn(
              'h-10 w-10 border border-[#e7d6bf] rounded-lg',
              'text-[#2c2e4b] hover:bg-[#e7d6bf]/10'
            )}
          >
            <RefreshCw className={cn('h-4 w-4', isRefetching && 'animate-spin')} />
          </Button>
        </div>
      </div>

      <section className="space-y-4">
        <AppointmentAnalytics appointments={appointments} isLoading={isLoading} />
        <AppointmentTable
          appointments={appointments}
          isLoading={isLoading}
          isRefreshing={isRefetching}
          onRefresh={refetch}
        />
      </section>
    </div>
  );
}

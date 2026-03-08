'use client';

/**
 * Surgeon Dashboard
 * 
 * Clean, minimal view showing only:
 * - Today's confirmed sessions
 * - Upcoming confirmed sessions
 * - Patient notes and procedure information
 * 
 * No noise. No rejected inquiries. No drafts. No pending items.
 * 
 * REFACTORED: Extracted core UI into standalone components for better maintainability.
 */

import { useAuth } from '@/hooks/patient/useAuth';
import { useDoctorTodayAppointments, useDoctorUpcomingAppointments, useDoctorPendingConfirmations } from '@/hooks/doctor/useDoctorDashboard';
import { useConfirmAppointment, useRescheduleAppointment } from '@/hooks/doctor/useConsultation';
import { doctorApi } from '@/lib/api/doctor';
import { PendingConfirmationsSection } from '@/components/doctor/PendingConfirmationsSection';
import { useState, useEffect } from 'react';
import { Activity, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { TheatreScheduleView } from '@/components/doctor/TheatreScheduleView';
import { useRouter } from 'next/navigation';

// Refactored Components
import { DashboardHeader } from './components/DashboardHeader';
import { OnboardingWidget } from './components/OnboardingWidget';
import { TodayPatientFlow } from './components/TodayPatientFlow';
import { UpcomingSchedule } from './components/UpcomingSchedule';

export default function DoctorDashboardPage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [theatreCases, setTheatreCases] = useState<any[]>([]);
  const [loadingTheatre, setLoadingTheatre] = useState(false);
  const router = useRouter();
  const { mutateAsync: confirmAppointment } = useConfirmAppointment();
  const { mutateAsync: rescheduleAppointment } = useRescheduleAppointment();

  const {
    data: todayAppointments = [],
    isLoading: loadingToday
  } = useDoctorTodayAppointments(user?.id, isAuthenticated && !!user);

  const {
    data: upcomingAppointments = [],
    isLoading: loadingUpcoming
  } = useDoctorUpcomingAppointments(user?.id, isAuthenticated && !!user);

  const {
    data: pendingConfirmations = [],
    isLoading: loadingPendingConfirmations
  } = useDoctorPendingConfirmations(user?.id, isAuthenticated && !!user);

  const loading = loadingToday || loadingUpcoming;

  // Load theater schedule
  useEffect(() => {
    if (isAuthenticated && user) {
      loadTheatreSchedule();
    }
  }, [isAuthenticated, user]);

  const loadTheatreSchedule = async () => {
    if (!user) return;
    try {
      setLoadingTheatre(true);
      const startDate = new Date();
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 7);
      const response = await doctorApi.getTheatreSchedule(startDate, endDate);
      if (response.success && response.data) {
        const now = new Date();
        const currentHours = now.getHours();
        const currentMinutes = now.getMinutes();

        const relevantCases = response.data.filter((theatreCase: any) => {
          const apt = theatreCase.appointment;
          if (!apt?.time) return true;
          try {
            const [aptHours, aptMinutes] = apt.time.split(':').map(Number);
            if (!isNaN(aptHours) && !isNaN(aptMinutes)) {
              const aptTotalMinutes = aptHours * 60 + aptMinutes;
              const nowTotalMinutes = currentHours * 60 + currentMinutes;
              return (aptTotalMinutes + 60) > nowTotalMinutes;
            }
          } catch (e) {
            console.error('Error parsing theatre case time:', apt.time);
          }
          return true;
        });
        setTheatreCases(relevantCases);
      }
    } catch (error) {
      console.error('Error loading theater schedule:', error);
    } finally {
      setLoadingTheatre(false);
    }
  };

  const [showOnboarding, setShowOnboarding] = useState(false);
  const [checkingOnboarding, setCheckingOnboarding] = useState(true);

  useEffect(() => {
    async function checkSetup() {
      if (!user) return;
      try {
        const availResponse = await doctorApi.getMyAvailability();
        const hasWorkingDays = availResponse.success &&
          availResponse.data?.workingDays?.some((d: any) => d.isAvailable);
        if (!hasWorkingDays) {
          setShowOnboarding(true);
        }
      } catch (e) {
        console.error("Failed to check onboarding status", e);
      } finally {
        setCheckingOnboarding(false);
      }
    }
    if (isAuthenticated) {
      checkSetup();
    }
  }, [isAuthenticated, user]);

  const handleStartConsultation = (appointment: any) => {
    router.push(`/doctor/consultations/${appointment.id}/session`);
  };

  const handleConfirmAppointment = async (appointmentId: number, notes?: string) => {
    await confirmAppointment({ appointmentId, action: 'confirm', notes });
  };

  const handleRejectAppointment = async (appointmentId: number, reason: string) => {
    await confirmAppointment({ appointmentId, action: 'reject', rejectionReason: reason });
  };

  const handleRescheduleAppointment = async (appointmentId: number, newDate: Date | string, newTime: string, reason?: string) => {
    await rescheduleAppointment({ appointmentId, newDate, newTime, reason });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[80vh]">
        <div className="text-center">
          <div className="relative mb-4">
            <div className="h-16 w-16 rounded-full border-4 border-slate-100 border-t-emerald-500 animate-spin mx-auto" />
            <div className="absolute inset-0 flex items-center justify-center">
              <Activity className="h-6 w-6 text-slate-300" />
            </div>
          </div>
          <p className="text-sm font-medium text-slate-500">Preparing clinical workspace...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center p-8 bg-white rounded-2xl shadow-xl border border-slate-100 max-w-md">
          <div className="h-16 w-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <User className="h-8 w-8 text-slate-400" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Authentication Required</h2>
          <p className="text-slate-500 mb-8">Please log in to your clinical account to access the dashboard.</p>
          <Link href="/login" className="w-full">
            <Button size="lg" className="w-full bg-slate-900 hover:bg-slate-800 text-white rounded-xl shadow-lg">
              Return to Login
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in duration-500">
      <DashboardHeader user={user} />

      <div className="space-y-6">
        <OnboardingWidget 
          user={user} 
          show={showOnboarding} 
          isLoading={checkingOnboarding} 
        />

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
          <div className="xl:col-span-8 space-y-8">
            <PendingConfirmationsSection
              appointments={pendingConfirmations}
              onConfirm={handleConfirmAppointment}
              onReject={handleRejectAppointment}
              onReschedule={handleRescheduleAppointment}
              isLoading={loadingPendingConfirmations}
            />

            <TodayPatientFlow
              appointments={todayAppointments}
              isLoading={loading}
              onStartConsultation={handleStartConsultation}
            />

            <UpcomingSchedule
              appointments={upcomingAppointments}
              isLoading={loading}
            />
          </div>

          <div className="xl:col-span-4 space-y-5">
            <section className="sticky top-6 space-y-5">
              <TheatreScheduleView
                cases={theatreCases}
                loading={loadingTheatre}
              />
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

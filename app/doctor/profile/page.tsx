'use client';

/**
 * Doctor Profile Page — Hybrid client-side cached approach
 *
 * Uses React Query hooks to fetch data from API routes.
 * - First visit: fetches from API, shows loading skeleton briefly.
 * - Subsequent visits: React Query serves from cache INSTANTLY,
 *   then revalidates in the background.
 *
 * This eliminates the "loading skeleton on every visit" problem
 * that the previous async Server Component caused.
 */

import { useAuth } from '@/hooks/patient/useAuth';
import { useRouter } from 'next/navigation';
import { useMemo } from 'react';
import {
  useDoctorMyProfile,
  useDoctorMyAvailability,
  useDoctorMyAppointments,
} from '@/hooks/doctor/useDoctorProfile';
import { DoctorProfileView } from '@/components/doctor/profile/DoctorProfileView';
import DoctorProfileLoading from './loading';

export default function DoctorProfilePage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();

  // ─── React Query hooks (cached across navigations) ──────────────────────
  const {
    data: profileData,
    isLoading: profileLoading,
    error: profileError,
  } = useDoctorMyProfile();

  const { data: availability } = useDoctorMyAvailability();

  const { data: allAppointments = [] } = useDoctorMyAppointments(
    profileData?.id,
  );

  // ─── Derive today / upcoming from the single appointments fetch ─────────
  const { todayAppointments, upcomingAppointments } = useMemo(() => {
    if (!allAppointments.length) {
      return { todayAppointments: [], upcomingAppointments: [] };
    }

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrowStart = new Date(todayStart);
    tomorrowStart.setDate(tomorrowStart.getDate() + 1);
    const activeStatuses = new Set(['SCHEDULED', 'CONFIRMED']);

    return {
      todayAppointments: allAppointments.filter((a: any) => {
        const d = new Date(a.appointmentDate);
        return d >= todayStart && d < tomorrowStart && activeStatuses.has(a.status);
      }),
      upcomingAppointments: allAppointments.filter((a: any) => {
        const d = new Date(a.appointmentDate);
        return d >= todayStart && activeStatuses.has(a.status);
      }),
    };
  }, [allAppointments]);

  // ─── Auth gate ──────────────────────────────────────────────────────────
  if (authLoading) return <DoctorProfileLoading />;

  if (!isAuthenticated || !user) {
    router.push('/login');
    return null;
  }

  // ─── Data loading: show skeleton ONLY when no cached data exists ────────
  if (profileLoading && !profileData) {
    return <DoctorProfileLoading />;
  }

  // ─── Error / missing profile ────────────────────────────────────────────
  if (profileError || !profileData) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <p className="text-muted-foreground">
            Profile not found. Please contact support.
          </p>
        </div>
      </div>
    );
  }

  // ─── Render ─────────────────────────────────────────────────────────────
  return (
    <DoctorProfileView
      doctorData={profileData}
      availability={availability ?? null}
      appointments={allAppointments}
      todayAppointments={todayAppointments}
      upcomingAppointments={upcomingAppointments}
    />
  );
}

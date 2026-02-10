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
import { useDoctorMyProfile } from '@/hooks/doctor/useDoctorProfile';
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
    />
  );
}

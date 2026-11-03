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

import { useEffect } from 'react';
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

  useEffect(() => {
    if (!authLoading && (!isAuthenticated || !user)) {
      router.push('/login');
    }
  }, [authLoading, isAuthenticated, user, router]);

  // ─── Auth gate ──────────────────────────────────────────────────────────
  if (authLoading) return <DoctorProfileLoading />;

  if (!isAuthenticated || !user) {
    return null;
  }

  // ─── Data loading: show skeleton ONLY when no cached data exists ────────
  if (profileLoading && !profileData) {
    return <DoctorProfileLoading />;
  }

  // ─── Error / missing profile ────────────────────────────────────────────
  if (profileError || !profileData) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="max-w-md border border-white/15 bg-[#2c2e4b]/70 px-6 py-8 text-center">
          <p className="text-sm font-semibold text-white">Profile not found</p>
          <p className="mt-2 text-xs text-[#e7d6bf]">
            We could not load your doctor profile. Please refresh or contact clinic support.
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

import { getCurrentUserFull } from '@/lib/auth/server-auth';
import { redirect } from 'next/navigation';
import {
  getDoctorProfile,
  getDoctorAppointments,
  getDoctorAvailability
} from '@/app/actions/doctor';
import { DoctorProfileView } from '@/components/doctor/profile/DoctorProfileView';

export default async function DoctorProfilePage() {
  // 1. Server-Side Authentication
  const user = await getCurrentUserFull();

  if (!user) {
    redirect('/login');
  }

  if (user.role !== 'DOCTOR' && user.role !== 'ADMIN') {
    // redirect('/dashboard');
  }

  // 2. Pre-fetch Data in Parallel (optimized: 3 queries instead of 5)
  //    - Removed 2 redundant getDoctorAppointments calls; today/upcoming
  //      are filtered client-side from the single appointments fetch.
  //    - getDoctorAvailability receives user.id (it internally resolves the doctor).
  const doctorId = user.doctor_profile?.id || '';

  const [
    profileResult,
    appointmentsResult,
    availabilityResult,
  ] = await Promise.all([
    getDoctorProfile(user.id),
    getDoctorAppointments(doctorId, { limit: 100 }),
    getDoctorAvailability(user.id),
  ]);

  // Derive today/upcoming from the single appointments fetch (client-side filter)
  const allAppointments = appointmentsResult.success && appointmentsResult.data
    ? appointmentsResult.data
    : [];

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrowStart = new Date(todayStart);
  tomorrowStart.setDate(tomorrowStart.getDate() + 1);

  const activeStatuses = new Set(['SCHEDULED', 'CONFIRMED']);

  const todayResult = {
    success: true,
    data: allAppointments.filter((a: any) => {
      const d = new Date(a.appointmentDate);
      return d >= todayStart && d < tomorrowStart && activeStatuses.has(a.status);
    }),
  };

  const upcomingResult = {
    success: true,
    data: allAppointments.filter((a: any) => {
      const d = new Date(a.appointmentDate);
      return d >= todayStart && activeStatuses.has(a.status);
    }),
  };

  // Handle profile missing
  if (!profileResult.success || !profileResult.data) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-muted-foreground">Profile not found. Please contact support.</p>
        </div>
      </div>
    );
  }

  // 3. Render Client View with Data
  return (
    <DoctorProfileView
      doctorData={profileResult.data}
      availability={availabilityResult.success ? availabilityResult.data : null}
      appointments={allAppointments}
      todayAppointments={todayResult.data}
      upcomingAppointments={upcomingResult.data}
    />
  );
}


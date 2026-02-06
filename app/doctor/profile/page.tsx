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

  // 2. Pre-fetch Data in Parallel
  const [
    profileResult,
    appointmentsResult,
    availabilityResult,
    todayResult,
    upcomingResult
  ] = await Promise.all([
    getDoctorProfile(user.id),
    getDoctorAppointments(user.doctor_profile?.id || '', { limit: 100 }), // Fetch recent history
    getDoctorAvailability(user.id),
    // Fetch specific buckets if needed, or filter on client. 
    // We'll fetch them as separate queries for now to match original logic.
    getDoctorAppointments(user.doctor_profile?.id || '', {
      startDate: new Date(),
      endDate: new Date(new Date().setDate(new Date().getDate() + 1)),
      status: 'SCHEDULED,CONFIRMED',
      limit: 20
    }),
    getDoctorAppointments(user.doctor_profile?.id || '', {
      startDate: new Date(),
      status: 'SCHEDULED,CONFIRMED',
      limit: 20
    }),
  ]);

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
      appointments={appointmentsResult.success && appointmentsResult.data ? appointmentsResult.data : []}
      todayAppointments={todayResult.success && todayResult.data ? todayResult.data : []}
      upcomingAppointments={upcomingResult.success && upcomingResult.data ? upcomingResult.data : []}
    />
  );
}


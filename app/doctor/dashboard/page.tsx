import { getCurrentUser } from '@/lib/auth/server-auth';
import { redirect } from 'next/navigation';
import { getDoctorDashboardData } from '@/actions/doctor/get-dashboard-data';
import DoctorDashboardClient from './DoctorDashboardClient';

export default async function DoctorDashboardPage() {
  const user = await getCurrentUser();

  if (!user || (user.role !== 'DOCTOR' && user.role !== 'ADMIN')) {
    redirect('/login');
  }

  let initialData;
  try {
    initialData = await getDoctorDashboardData();
  } catch (error) {
    console.error('[DoctorDashboard] Failed to load dashboard data:', error);
  }

  return <DoctorDashboardClient initialData={initialData} />;
}

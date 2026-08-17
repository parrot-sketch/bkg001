import { getCurrentUser } from '@/lib/auth/server-auth';
import { redirect } from 'next/navigation';
import DoctorDashboardClient from './DoctorDashboardClient';

export default async function DoctorDashboardPage() {
  const user = await getCurrentUser();

  if (!user || (user.role !== 'DOCTOR' && user.role !== 'ADMIN')) {
    redirect('/login');
  }

  return <DoctorDashboardClient />;
}

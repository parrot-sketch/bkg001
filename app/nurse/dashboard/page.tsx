import { getCurrentUser } from '@/lib/auth/server-auth';
import { redirect } from 'next/navigation';
import NurseDashboardClient from './NurseDashboardClient';

export default async function NurseDashboardPage() {
  const user = await getCurrentUser();

  if (!user || (user.role !== 'NURSE' && user.role !== 'ADMIN')) {
    redirect('/login');
  }

  return <NurseDashboardClient />;
}

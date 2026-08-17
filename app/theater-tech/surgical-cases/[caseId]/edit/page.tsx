import { getCurrentUser } from '@/lib/auth/server-auth';
import { redirect } from 'next/navigation';
import { TheaterTechCaseForm } from '@/components/theater-tech/TheaterTechCaseForm';

interface PageProps {
  params: Promise<{ caseId: string }>;
}

export default async function TheaterTechPlanEditPage({ params }: PageProps) {
  const { caseId } = await params;
  const user = await getCurrentUser();

  if (!user || (user.role !== 'THEATER_TECHNICIAN' && user.role !== 'ADMIN')) {
    redirect('/login');
  }

  return <TheaterTechCaseForm caseId={caseId} />;
}

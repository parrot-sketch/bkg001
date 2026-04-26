import { redirect } from 'next/navigation';

interface PageProps {
  params: Promise<{ caseId: string }>;
  searchParams?: Promise<{ tab?: string }>;
}

export default async function DoctorSurgicalCaseWorkspacePage({ params, searchParams }: PageProps) {
  const { caseId } = await params;

  const tab = (await searchParams)?.tab;
  const tabMap: Record<string, string> = {
    'case-plan': 'case-plan',
    'preop-ward-checklist': 'preop-ward-checklist',
    'surgical-notes': 'surgical-notes',
    'operative-record': 'operative-record',
    'charge-sheet': 'charge-sheet',
  };

  const target = tab && tabMap[tab] ? tabMap[tab] : 'case-plan';
  redirect(`/doctor/surgical-cases/${caseId}/${target}`);
}

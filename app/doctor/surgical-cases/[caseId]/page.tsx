'use client';

import { useEffect, useMemo } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';

export default function DoctorSurgicalCaseWorkspacePage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();

  const caseId = (params?.caseId as string | undefined) ?? '';
  const tab = searchParams?.get('tab') ?? undefined;

  const target = useMemo(() => {
    const tabMap: Record<string, string> = {
      'case-plan': 'case-plan',
      'surgical-notes': 'surgical-notes',
      'operative-record': 'operative-record',
      'charge-sheet': 'charge-sheet',
      'preop-ward-checklist': 'preop-ward-checklist',
      // Deferred — keep deep-links from landing on unfinished surfaces
      consents: 'case-plan',
      photos: 'case-plan',
    };
    return tab && tabMap[tab] ? tabMap[tab] : 'case-plan';
  }, [tab]);

  useEffect(() => {
    if (!caseId) return;
    router.replace(`/doctor/surgical-cases/${caseId}/${target}`);
  }, [caseId, router, target]);

  return (
    <div className="max-w-3xl mx-auto space-y-4 py-6">
      <Skeleton className="h-7 w-64" />
      <Skeleton className="h-36 w-full" />
      <Skeleton className="h-72 w-full" />
    </div>
  );
}

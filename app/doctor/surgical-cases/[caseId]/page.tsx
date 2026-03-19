'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function CaseRedirectPage() {
  const params = useParams();
  const router = useRouter();
  const caseId = params.caseId as string;

  useEffect(() => {
    if (caseId) {
      router.replace(`/doctor/surgical-cases/${caseId}/plan`);
    }
  }, [caseId, router]);

  return (
    <div className="flex h-[60vh] items-center justify-center">
      <div className="text-center space-y-3">
        <div className="h-10 w-10 border-2 border-primary border-t-transparent rounded-full mx-auto animate-spin" />
        <p className="text-sm text-muted-foreground">Loading case...</p>
      </div>
    </div>
  );
}

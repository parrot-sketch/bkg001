'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

/** Photos are deferred — send doctors back to case plan. */
export default function DoctorPhotosPage() {
  const router = useRouter();
  const params = useParams();
  const caseId = (params?.caseId as string | undefined) ?? '';

  useEffect(() => {
    if (!caseId) return;
    router.replace(`/doctor/surgical-cases/${caseId}/case-plan`);
  }, [caseId, router]);

  return null;
}

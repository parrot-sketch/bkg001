'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';

import { PhotosTab } from '@/components/doctor/case-plan/PhotosTab';
import { useCasePlanDetail } from '@/hooks/doctor/useCasePlan';
import { authenticatedFetch } from '@/lib/doctor/authenticatedFetch';
import { useDoctorSurgicalCaseWorkspace } from '@/components/doctor/surgical-case-workspace/DoctorSurgicalCaseContext';
import { Button } from '@/components/ui/button';

/**
 * Doctor pre-op photos — CasePlan PatientImage only.
 */
export function PhotosSection() {
  const { caseId } = useDoctorSurgicalCaseWorkspace();
  const { data, isLoading, error, refetch } = useCasePlanDetail(caseId);
  const [bootstrapping, setBootstrapping] = useState(false);
  const [bootError, setBootError] = useState<string | null>(null);

  const needsBootstrap = !isLoading && (!!error || !data?.casePlan) && !bootstrapping;

  useEffect(() => {
    if (!needsBootstrap) return;
    let cancelled = false;
    (async () => {
      setBootstrapping(true);
      setBootError(null);
      try {
        const res = await authenticatedFetch(`/api/doctor/surgical-cases/${caseId}/notes`, {
          method: 'PUT',
          body: JSON.stringify({ content: '' }),
        });
        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json.error || 'Could not prepare case documents');
        }
        if (!cancelled) await refetch();
      } catch (err) {
        if (!cancelled) {
          setBootError(err instanceof Error ? err.message : 'Failed to prepare photos');
        }
      } finally {
        if (!cancelled) setBootstrapping(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [needsBootstrap, caseId, refetch]);

  if (isLoading || bootstrapping) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-500">
        <Loader2 className="h-6 w-6 animate-spin text-slate-300" />
        <p className="mt-3 text-sm">Preparing photos…</p>
      </div>
    );
  }

  if (bootError) {
    return (
      <div className="space-y-3 rounded-xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">
        <p>{bootError}</p>
        <Button variant="outline" size="sm" onClick={() => void refetch()}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PhotosTab casePlan={data?.casePlan as any} caseId={caseId} />
    </div>
  );
}

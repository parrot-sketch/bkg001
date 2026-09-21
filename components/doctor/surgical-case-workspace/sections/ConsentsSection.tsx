'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';

import { ConsentsTab } from '@/components/doctor/case-plan/ConsentsTab';
import { useCasePlanDetail } from '@/hooks/doctor/useCasePlan';
import { authenticatedFetch } from '@/lib/doctor/authenticatedFetch';
import { useDoctorSurgicalCaseWorkspace } from '@/components/doctor/surgical-case-workspace/DoctorSurgicalCaseContext';
import { Button } from '@/components/ui/button';

/**
 * Doctor consents — CasePlan ConsentForm only.
 * Bootstraps CasePlan via notes ensure if missing (schedule-created cases).
 */
export function ConsentsSection() {
  const { caseId } = useDoctorSurgicalCaseWorkspace();
  const { data, isLoading, error, refetch } = useCasePlanDetail(caseId);
  const [bootstrapping, setBootstrapping] = useState(false);
  const [bootError, setBootError] = useState<string | null>(null);

  const needsBootstrap =
    !isLoading &&
    (!!error || !data?.casePlan) &&
    !bootstrapping;

  useEffect(() => {
    if (!needsBootstrap) return;
    let cancelled = false;
    (async () => {
      setBootstrapping(true);
      setBootError(null);
      try {
        // Creating empty notes row ensures CasePlan for consents/photos
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
          setBootError(err instanceof Error ? err.message : 'Failed to prepare consents');
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
        <p className="mt-3 text-sm">Preparing consents…</p>
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
      <header className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-widest text-[#caa26a]">
          Doctor document
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-[#2c2e4b]">Consents</h1>
        <p className="max-w-2xl text-sm text-slate-500">
          Procedure and anaesthesia consents for this surgical case. Managed by the surgeon — not
          the nurse ward checklist.
        </p>
      </header>
      <ConsentsTab casePlan={data?.casePlan as any} caseId={caseId} />
    </div>
  );
}

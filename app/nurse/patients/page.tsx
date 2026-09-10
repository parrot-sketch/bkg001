import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import { PatientsFeature } from '@/app/frontdesk/patients/_feature/PatientsFeature';

/**
 * Nurse Patients — same registry + intake/registration as frontdesk.
 * Nurses already have API access to patient list, stats, and create.
 */
export default function NursePatientsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-[60vh]">
          <div className="text-center space-y-3">
            <Loader2 className="h-8 w-8 animate-spin text-[#caa26a] mx-auto" />
            <p className="text-xs text-white/60">Loading patient registry...</p>
          </div>
        </div>
      }
    >
      <PatientsFeature />
    </Suspense>
  );
}

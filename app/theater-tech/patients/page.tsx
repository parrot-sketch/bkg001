import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import { PatientsFeature } from './_feature/PatientsFeature';

export default function TheaterTechPatientsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-[60vh]">
          <div className="text-center space-y-3">
            <Loader2 className="h-8 w-8 animate-spin text-[#caa26a] mx-auto" />
            <p className="text-xs text-[#2c2e4b]/50">Loading patient registry...</p>
          </div>
        </div>
      }
    >
      <PatientsFeature />
    </Suspense>
  );
}

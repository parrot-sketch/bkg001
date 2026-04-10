'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

interface CaseData {
  procedureDate: string | null;
  diagnosis: string;
  procedures: { id: string }[];
  anaesthesiaType: string;
}

export default function CasePage() {
  const params = useParams();
  const router = useRouter();
  const caseId = params.caseId as string;
  const [isComplete, setIsComplete] = useState<boolean | null>(null);

  useEffect(() => {
    async function checkCaseStatus() {
      if (!caseId) return;
      
      try {
        const res = await fetch(`/api/doctor/surgical-cases/${caseId}`);
        const data = await res.json();
        
        if (data.success && data.case) {
          const c: CaseData = data.case;
          const hasRequiredFields = c.procedureDate && c.diagnosis && 
            c.procedures?.length > 0 && c.anaesthesiaType;
          
          if (hasRequiredFields) {
            router.replace(`/doctor/surgical-cases/${caseId}/view`);
          } else {
            router.replace(`/doctor/surgical-cases/${caseId}/plan`);
          }
        } else {
          router.replace('/doctor/surgical-cases');
        }
      } catch (e) {
        router.replace('/doctor/surgical-cases');
      } finally {
        setIsComplete(false);
      }
    }

    checkCaseStatus();
  }, [caseId, router]);

  if (isComplete === null) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="text-center space-y-3">
          <div className="h-10 w-10 border-2 border-primary border-t-transparent rounded-full mx-auto animate-spin" />
          <p className="text-sm text-muted-foreground">Loading case...</p>
        </div>
      </div>
    );
  }

  return null;
}

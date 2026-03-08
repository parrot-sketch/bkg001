'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, CheckCircle2, Edit } from 'lucide-react';
import { CaseReadinessStatus, getCaseReadinessStatusLabel } from '@/domain/enums/CaseReadinessStatus';

interface CasePlanDetailHeaderProps {
  id: number;
  appointmentId: number;
  patientName: string;
  specialization: string;
  readinessStatus: CaseReadinessStatus;
  readyForSurgery: boolean;
}

export function CasePlanDetailHeader({
  id,
  appointmentId,
  patientName,
  specialization,
  readinessStatus,
  readyForSurgery,
}: CasePlanDetailHeaderProps) {
  const router = useRouter();

  const getReadinessVariant = (status: CaseReadinessStatus): 'default' | 'secondary' | 'destructive' | 'outline' => {
    switch (status) {
      case CaseReadinessStatus.READY:
        return 'default';
      case CaseReadinessStatus.PENDING_LABS:
      case CaseReadinessStatus.PENDING_CONSENT:
      case CaseReadinessStatus.PENDING_REVIEW:
        return 'secondary';
      case CaseReadinessStatus.ON_HOLD:
        return 'destructive';
      default:
        return 'outline';
    }
  };

  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Case Plan #{id}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {patientName} &middot; {specialization}
          </p>
        </div>
      </div>
      <div className="flex items-center flex-wrap gap-3">
        <Badge variant={getReadinessVariant(readinessStatus)}>
          {getCaseReadinessStatusLabel(readinessStatus)}
        </Badge>
        {readyForSurgery && (
          <Badge variant="default" className="bg-green-500">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Ready for Surgery
          </Badge>
        )}
        <Button asChild>
          <Link href={`/doctor/operative/plan/${appointmentId}/new`}>
            <Edit className="h-4 w-4 mr-2" />
            Edit Plan
          </Link>
        </Button>
      </div>
    </div>
  );
}

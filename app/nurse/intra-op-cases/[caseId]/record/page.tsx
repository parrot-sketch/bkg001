'use client';

import { useParams } from 'next/navigation';
import { NursingOperationRecordEditor } from '@/components/nurse/nursing-operation-record/NursingOperationRecordEditor';

export default function NurseIntraOpRecordPage() {
  const params = useParams();
  const caseId = params?.caseId as string;
  return <NursingOperationRecordEditor caseId={caseId} />;
}


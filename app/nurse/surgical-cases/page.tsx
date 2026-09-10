'use client';

import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { Activity, ClipboardList, Eye, HeartPulse } from 'lucide-react';
import {
  SurgicalCasesList,
  type SurgicalCaseAction,
} from '@/components/frontdesk/SurgicalCasesList';
import type { FrontdeskSurgicalCaseListItem } from '@/lib/api/frontdesk';

const NURSE_STATUS_FILTERS = [
  { value: 'ALL', label: 'All' },
  { value: 'READY_FOR_WARD_PREP,IN_WARD_PREP', label: 'Ward Prep' },
  { value: 'READY_FOR_THEATER_BOOKING,SCHEDULED,IN_PREP,IN_THEATER', label: 'Intra-Op' },
  { value: 'RECOVERY,COMPLETED', label: 'Post-Op' },
];

export default function NurseSurgicalCasesPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const rowActions = (
    caseItem: FrontdeskSurgicalCaseListItem,
  ): SurgicalCaseAction[] => {
    const actions: SurgicalCaseAction[] = [];

    if (
      ['READY_FOR_WARD_PREP', 'IN_WARD_PREP', 'READY_FOR_THEATER_BOOKING'].includes(
        caseItem.status,
      )
    ) {
      actions.push({
        key: 'ward-prep',
        label: 'Ward Prep Checklist',
        icon: ClipboardList,
        onClick: (c) => router.push(`/nurse/ward-prep/${c.id}/checklist`),
      });
    }

    if (
      ['READY_FOR_THEATER_BOOKING', 'SCHEDULED', 'IN_PREP', 'IN_THEATER'].includes(
        caseItem.status,
      )
    ) {
      actions.push({
        key: 'intra-op',
        label: 'Intra-Op Record',
        icon: Activity,
        onClick: (c) => router.push(`/nurse/intra-op-cases/${c.id}/record`),
      });
    }

    if (['RECOVERY', 'COMPLETED'].includes(caseItem.status)) {
      actions.push({
        key: 'post-op',
        label: 'Post-Op Record',
        icon: HeartPulse,
        onClick: (c) => router.push(`/nurse/recovery-cases/${c.id}/record`),
      });
    }

    actions.push({
      key: 'details',
      label: 'Case Details',
      icon: Eye,
      onClick: (c) => router.push(`/nurse/surgical-cases/${c.id}`),
    });

    return actions;
  };

  return (
    <SurgicalCasesList
      title="Surgical Cases"
      description="Schedule procedures and open the document for each clinical stage."
      showScheduleButton
      statusFilterOptions={NURSE_STATUS_FILTERS}
      detailHref={(c) => `/nurse/surgical-cases/${c.id}`}
      rowActions={rowActions}
      onScheduleSuccess={(caseId) => {
        queryClient.invalidateQueries({ queryKey: ['nurse'] });
        if (caseId) router.push(`/nurse/surgical-cases/${caseId}`);
      }}
    />
  );
}

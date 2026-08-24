'use client';

import { SurgicalCasesList, type SurgicalCaseAction } from '@/components/frontdesk/SurgicalCasesList';
import { useRouter } from 'next/navigation';
import { Receipt, Pencil } from 'lucide-react';
import type { FrontdeskSurgicalCaseListItem } from '@/lib/api/frontdesk';

const STATUS_TABS = [
  { value: '', label: 'All' },
  { value: 'DRAFT,PLANNING', label: 'Planning' },
  { value: 'READY_FOR_WARD_PREP,IN_WARD_PREP', label: 'Ward Prep' },
  { value: 'READY_FOR_THEATER_BOOKING,SCHEDULED', label: 'Booking' },
  { value: 'IN_PREP,IN_THEATER,RECOVERY', label: 'Live' },
  { value: 'COMPLETED,CANCELLED', label: 'Done' },
];

export default function TheaterTechSurgicalCasesPage() {
  const router = useRouter();

  const rowActions = (caseItem: FrontdeskSurgicalCaseListItem): SurgicalCaseAction[] => [
    {
      key: 'view',
      label: 'View',
      icon: Receipt,
      onClick: () => router.push(`/theater-tech/surgical-cases/${caseItem.id}`),
    },
    {
      key: 'edit-plan',
      label: 'Edit Plan',
      icon: Pencil,
      onClick: () => router.push(`/theater-tech/surgical-cases/${caseItem.id}/edit`),
    },
  ];

  return (
    <SurgicalCasesList
      title="Surgical Cases"
      description="Track each case from planning through booking and live theater flow."
      statusFilterOptions={STATUS_TABS}
      rowActions={rowActions}
      detailHref={(c) => `/theater-tech/surgical-cases/${c.id}`}
      onScheduleSuccess={(caseId) => {
        if (caseId) router.push(`/theater-tech/surgical-cases/${caseId}`);
      }}
    />
  );
}

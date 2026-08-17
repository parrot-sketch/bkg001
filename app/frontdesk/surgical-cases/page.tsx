'use client';

import { SurgicalCasesList } from '@/components/frontdesk/SurgicalCasesList';
import type { FrontdeskSurgicalCaseListItem } from '@/lib/api/frontdesk';

export default function FrontdeskSurgicalCasesPage() {
  return (
    <SurgicalCasesList
      title="Surgical Schedule"
      description="Create and manage scheduled surgical procedures"
    />
  );
}

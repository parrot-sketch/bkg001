'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TheaterTechDashboardMetrics } from './TheaterTechDashboardMetrics';
import { ScheduleProcedureDialog } from '@/components/frontdesk/ScheduleProcedureDialog';
import type { ScheduleProcedureResponse } from '@/lib/api/frontdesk';

export default function TheaterTechDashboard() {
  const router = useRouter();
  const [scheduleOpen, setScheduleOpen] = useState(false);

  const handleScheduleSuccess = (data: ScheduleProcedureResponse) => {
    setScheduleOpen(false);
    router.push(`/theater-tech/surgical-cases/${data.surgicalCaseId}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">Theater Tech Dashboard</h1>
          <p className="text-sm text-white/60 mt-1">
            Patient registry and surgical case activity at a glance.
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => setScheduleOpen(true)}
          className="bg-[#caa26a] hover:bg-[#b8913e] text-white font-bold shadow-sm shrink-0"
        >
          <Plus className="h-4 w-4 mr-1.5" />
          Schedule Procedure
        </Button>
      </div>

      <TheaterTechDashboardMetrics onScheduleClick={() => setScheduleOpen(true)} />

      <ScheduleProcedureDialog
        open={scheduleOpen}
        onOpenChange={setScheduleOpen}
        onSuccess={handleScheduleSuccess}
      />
    </div>
  );
}

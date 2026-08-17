'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { FrontdeskSurgicalCaseListItem } from '@/lib/api/frontdesk';

interface CasePlanCardProps {
  data: FrontdeskSurgicalCaseListItem;
}

export function CasePlanCard({ data }: CasePlanCardProps) {
  if (!data.case_plan) return null;

  return (
    <Card className="bg-white/95">
      <CardHeader>
        <CardTitle className="text-base text-[#2c2e4b]">Case Plan</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <p className="text-xs text-slate-500">Readiness Status</p>
          <p className="text-sm font-medium text-slate-900">{data.case_plan.readiness_status || '—'}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Ready for Surgery</p>
          <p className="text-sm font-medium text-slate-900">{data.case_plan.ready_for_surgery ? 'Yes' : 'No'}</p>
        </div>
        {data.case_plan.estimated_duration_minutes && (
          <div>
            <p className="text-xs text-slate-500">Estimated Duration</p>
            <p className="text-sm font-medium text-slate-900">{data.case_plan.estimated_duration_minutes} min</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { FrontdeskSurgicalCaseListItem } from '@/lib/api/frontdesk';

interface AssociatedProceduresCardProps {
  data: FrontdeskSurgicalCaseListItem;
}

export function AssociatedProceduresCard({ data }: AssociatedProceduresCardProps) {
  if (!data.case_procedures?.length) return null;

  return (
    <Card className="bg-white/95">
      <CardHeader>
        <CardTitle className="text-base text-[#2c2e4b]">Associated Procedures</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {data.case_procedures.map((cp: any) => (
            <div key={cp.id} className="flex items-center justify-between p-3 border border-slate-200 rounded-lg">
              <div>
                <p className="text-sm font-medium text-slate-900">{cp.procedure.name}</p>
                <p className="text-xs text-slate-500">{cp.procedure.category} {cp.procedure.subcategory ? `· ${cp.procedure.subcategory}` : ''}</p>
              </div>
              {cp.procedure.estimated_duration_minutes && (
                <span className="text-xs text-slate-600">{cp.procedure.estimated_duration_minutes} min</span>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

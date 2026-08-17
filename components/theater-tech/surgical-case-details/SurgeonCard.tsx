'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Stethoscope } from 'lucide-react';
import type { FrontdeskSurgicalCaseListItem } from '@/lib/api/frontdesk';

interface SurgeonCardProps {
  data: FrontdeskSurgicalCaseListItem;
}

export function SurgeonCard({ data }: SurgeonCardProps) {
  return (
    <Card className="bg-white/95">
      <CardHeader>
        <CardTitle className="text-base text-[#2c2e4b] flex items-center gap-2">
          <Stethoscope className="h-4 w-4" />
          Surgeon
        </CardTitle>
      </CardHeader>
      <CardContent>
        {data.primary_surgeon ? (
          <div>
            <p className="text-sm font-medium text-slate-900">{data.primary_surgeon.name}</p>
            {data.primary_surgeon.specialization && (
              <p className="text-xs text-slate-500">{data.primary_surgeon.specialization}</p>
            )}
          </div>
        ) : data.primary_surgeon_name ? (
          <p className="text-sm font-medium text-slate-900">{data.primary_surgeon_name}</p>
        ) : (
          <p className="text-sm text-slate-500">Not assigned</p>
        )}
      </CardContent>
    </Card>
  );
}

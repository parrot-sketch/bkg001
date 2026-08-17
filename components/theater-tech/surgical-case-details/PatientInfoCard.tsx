'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { User } from 'lucide-react';
import type { FrontdeskSurgicalCaseListItem } from '@/lib/api/frontdesk';

interface PatientInfoCardProps {
  data: FrontdeskSurgicalCaseListItem;
}

export function PatientInfoCard({ data }: PatientInfoCardProps) {
  return (
    <Card className="bg-white/95">
      <CardHeader>
        <CardTitle className="text-base text-[#2c2e4b] flex items-center gap-2">
          <User className="h-4 w-4" />
          Patient
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <p className="text-xs text-slate-500">Name</p>
          <p className="text-sm font-medium text-slate-900">
            {data.patient.first_name} {data.patient.last_name}
          </p>
        </div>
        {data.patient.file_number && (
          <div>
            <p className="text-xs text-slate-500">File Number</p>
            <p className="text-sm font-medium text-slate-900">#{data.patient.file_number}</p>
          </div>
        )}
        {data.patient.email && (
          <div>
            <p className="text-xs text-slate-500">Email</p>
            <p className="text-sm font-medium text-slate-900">{data.patient.email}</p>
          </div>
        )}
        {data.patient.phone && (
          <div>
            <p className="text-xs text-slate-500">Phone</p>
            <p className="text-sm font-medium text-slate-900">{data.patient.phone}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

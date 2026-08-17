'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Calendar, ClipboardList, Receipt, Activity } from 'lucide-react';
import type { FrontdeskSurgicalCaseListItem } from '@/lib/api/frontdesk';

interface ActionsCardProps {
  caseId: string;
  data: FrontdeskSurgicalCaseListItem;
  canBookTheater: boolean;
  isActive: boolean;
  onRecordVitals: () => void;
  onBookTheater: () => void;
  onScrollToBilling: () => void;
}

export function ActionsCard({
  caseId,
  data,
  canBookTheater,
  isActive,
  onRecordVitals,
  onBookTheater,
  onScrollToBilling,
}: ActionsCardProps) {
  const patientName = `${data.patient.first_name} ${data.patient.last_name}`;

  return (
    <Card className="bg-white/95">
      <CardHeader>
        <CardTitle className="text-base text-[#2c2e4b]">Actions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <Button
          size="sm"
          onClick={onRecordVitals}
          className="w-full bg-[#caa26a] hover:bg-[#b8913e] text-white font-bold shadow-sm"
        >
          <Activity className="h-4 w-4 mr-2" />
          Record Vitals
        </Button>
        {canBookTheater && (
          <Button
            size="sm"
            onClick={onBookTheater}
            className="w-full bg-[#2c2e4b] hover:bg-[#1e2038] text-white font-bold shadow-sm"
          >
            <Calendar className="h-4 w-4 mr-2" />
            Book Theater
          </Button>
        )}
        {isActive && (
          <Button asChild size="sm" variant="outline" className="w-full border-[#e7d6bf] text-[#2c2e4b] hover:bg-[#e7d6bf]/20">
            <Link href={`/theater-tech/dashboard/${caseId}`}>
              <ClipboardList className="h-4 w-4 mr-2" />
              Dayboard
            </Link>
          </Button>
        )}
        <Button asChild size="sm" variant="ghost" className="w-full text-slate-600 hover:text-slate-900">
          <Link href={`/theater-tech/surgical-cases/${caseId}/print`}>
            Print Summary
          </Link>
        </Button>
        <Button
          size="sm"
          onClick={onScrollToBilling}
          className="w-full bg-[#2c2e4b] hover:bg-[#1e2038] text-white font-bold shadow-sm"
        >
          <Receipt className="h-4 w-4 mr-2" />
          Update Bill
        </Button>
      </CardContent>
    </Card>
  );
}

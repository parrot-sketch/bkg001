'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useDoctorCases } from '@/hooks/use-doctor-dashboard';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { SurgicalCaseStatus } from '@prisma/client';
import Link from 'next/link';

type TabValue = 'planning' | 'scheduled' | 'recovery';

interface CasePipelineProps {
  isLoading: boolean;
}

export function CasePipeline({ isLoading }: CasePipelineProps) {
  const [activeTab, setActiveTab] = useState<TabValue>('planning');
  const cases = useDoctorCases();
  const router = useRouter();

  const filteredCases = (cases || []).filter((c) => {
    if (activeTab === 'planning') return c.status === SurgicalCaseStatus.PLANNING;
    if (activeTab === 'scheduled') return c.status === SurgicalCaseStatus.SCHEDULED;
    if (activeTab === 'recovery') return c.status === SurgicalCaseStatus.RECOVERY;
    return false;
  });

  const tabCounts = {
    planning: (cases || []).filter((c) => c.status === SurgicalCaseStatus.PLANNING).length,
    scheduled: (cases || []).filter((c) => c.status === SurgicalCaseStatus.SCHEDULED).length,
    recovery: (cases || []).filter((c) => c.status === SurgicalCaseStatus.RECOVERY).length,
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Surgical Cases</CardTitle>
          <Link href="/doctor/surgical-cases" className="text-xs text-slate-500 hover:underline">
            View All
          </Link>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabValue)}>
          <TabsList className="grid w-full grid-cols-3 h-9">
            <TabsTrigger value="planning" className="text-xs">
              Planning ({tabCounts.planning})
            </TabsTrigger>
            <TabsTrigger value="scheduled" className="text-xs">
              Scheduled ({tabCounts.scheduled})
            </TabsTrigger>
            <TabsTrigger value="recovery" className="text-xs">
              Recovery ({tabCounts.recovery})
            </TabsTrigger>
          </TabsList>

          {(['planning', 'scheduled', 'recovery'] as TabValue[]).map((tab) => (
            <TabsContent key={tab} value={tab} className="mt-4 space-y-2">
              {isLoading ? (
                <div className="space-y-2">
                  {[1, 2].map((i) => (
                    <Skeleton key={i} className="h-20 w-full rounded-lg" />
                  ))}
                </div>
              ) : filteredCases.length === 0 ? (
                <div className="py-8 text-center text-sm text-slate-500">
                  No {tab} cases
                </div>
              ) : (
                filteredCases.map((caseItem) => (
                  <div
                    key={caseItem.id}
                    className="p-3 border rounded-lg hover:bg-slate-50 cursor-pointer transition-colors"
                    onClick={() => router.push(`/doctor/surgical-cases/${caseItem.id}/case-plan`)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">
                          {caseItem.patient?.firstName} {caseItem.patient?.lastName}
                        </p>
                        <p className="text-xs text-slate-500 truncate">
                          {caseItem.procedureName || 'Surgical procedure'}
                        </p>
                        {caseItem.theaterBooking && (
                          <p className="text-xs text-slate-400 mt-1">
                            {format(new Date(caseItem.theaterBooking.startTime), 'MMM d, h:mm a')}
                          </p>
                        )}
                      </div>
                      <Badge variant="secondary" className="shrink-0 text-xs">
                        {caseItem.status}
                      </Badge>
                    </div>
                  </div>
                ))
              )}
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}

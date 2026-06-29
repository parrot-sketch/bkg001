'use client';

import { useState, useMemo } from 'react';
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
  const cases = useDoctorCases();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabValue>('planning');

  const filteredCases = useMemo(() => {
    const c = cases || [];
    switch (activeTab) {
      case 'planning': return c.filter((sc) => sc.status === SurgicalCaseStatus.PLANNING);
      case 'scheduled': return c.filter((sc) => sc.status === SurgicalCaseStatus.SCHEDULED);
      case 'recovery': return c.filter((sc) => sc.status === SurgicalCaseStatus.RECOVERY);
      default: return [];
    }
  }, [cases, activeTab]);

  const tabCounts = useMemo(() => {
    const c = cases || [];
    return {
      planning: c.filter((sc) => sc.status === SurgicalCaseStatus.PLANNING).length,
      scheduled: c.filter((sc) => sc.status === SurgicalCaseStatus.SCHEDULED).length,
      recovery: c.filter((sc) => sc.status === SurgicalCaseStatus.RECOVERY).length,
    };
  }, [cases]);

  return (
    <Card className="border border-slate-200 shadow-sm">
      <CardHeader className="border-b border-slate-100 px-5 py-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold text-[#121c1d]">Surgical Cases</CardTitle>
          <Link href="/doctor/surgical-cases" className="text-xs text-slate-400 hover:text-[#0c5d69] transition-colors">
            View All
          </Link>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabValue)}>
          <div className="px-5 pt-4">
            <TabsList className="grid w-full grid-cols-3 h-9 bg-slate-100">
              <TabsTrigger value="planning" className="text-xs data-[state=active]:bg-white data-[state=active]:text-[#121c1d] data-[state=active]:shadow-sm">
                Planning ({tabCounts.planning})
              </TabsTrigger>
              <TabsTrigger value="scheduled" className="text-xs data-[state=active]:bg-white data-[state=active]:text-[#121c1d] data-[state=active]:shadow-sm">
                Scheduled ({tabCounts.scheduled})
              </TabsTrigger>
              <TabsTrigger value="recovery" className="text-xs data-[state=active]:bg-white data-[state=active]:text-[#121c1d] data-[state=active]:shadow-sm">
                Recovery ({tabCounts.recovery})
              </TabsTrigger>
            </TabsList>
          </div>

          {(['planning', 'scheduled', 'recovery'] as TabValue[]).map((tab) => (
            <TabsContent key={tab} value={tab} className="mt-0 px-5 py-4">
              {isLoading ? (
                <div className="space-y-2">
                  {[1, 2].map((i) => (
                    <Skeleton key={i} className="h-20 w-full rounded-lg" />
                  ))}
                </div>
              ) : filteredCases.length === 0 ? (
                <div className="py-10 text-center text-sm text-slate-400">No {tab} cases</div>
              ) : (
                <div className="space-y-2">
                  {filteredCases.map((caseItem) => (
                    <div
                      key={caseItem.id}
                      className="p-3 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors"
                      onClick={() => router.push(`/doctor/surgical-cases/${caseItem.id}/case-plan`)}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-[#121c1d] truncate">
                            {caseItem.patient?.firstName} {caseItem.patient?.lastName}
                          </p>
                          <p className="text-xs text-slate-500 truncate mt-0.5">
                            {caseItem.procedureName || 'Surgical procedure'}
                          </p>
                          {caseItem.theaterBooking && (
                            <p className="text-xs text-slate-400 mt-1">
                              {format(new Date(caseItem.theaterBooking.startTime), 'MMM d, h:mm a')}
                            </p>
                          )}
                        </div>
                        <Badge variant="outline" className="text-[10px] font-medium border-slate-200 text-slate-600 shrink-0">
                          {caseItem.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}

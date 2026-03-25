'use client';

import { useState } from 'react';
import { 
  Scissors, 
  Calendar, 
  Activity, 
  HeartPulse, 
  ArrowRight, 
  Loader2,
  Clock,
  FileText,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useDoctorCases } from '@/hooks/use-doctor-dashboard';
import { useRouter } from 'next/navigation';
import { format, formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

type TabValue = 'planning' | 'scheduled' | 'theater' | 'recovery';

interface CasePipelineProps {
  isLoading: boolean;
}

export function CasePipeline({ isLoading }: CasePipelineProps) {
  const cases = useDoctorCases();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabValue>('planning');

  const pipeline = {
    planning: cases.filter(c => ['PLANNING', 'READY_FOR_SCHEDULING'].includes(c.status)),
    scheduled: cases.filter(c => ['SCHEDULED', 'IN_PREP', 'READY_FOR_THEATER_BOOKING'].includes(c.status)),
    inTheater: cases.filter(c => c.status === 'IN_THEATER'),
    recovery: cases.filter(c => c.status === 'RECOVERY' || (c.status === 'COMPLETED' && new Date(c.createdAt) >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))),
  };

  const counts = {
    planning: pipeline.planning.length,
    scheduled: pipeline.scheduled.length,
    inTheater: pipeline.inTheater.length,
    recovery: pipeline.recovery.length,
  };

  const handleCaseAction = (caseId: string, tab: TabValue) => {
    switch (tab) {
      case 'planning':
        router.push(`/doctor/surgical-cases/${caseId}/plan`);
        break;
      case 'scheduled':
        router.push(`/doctor/surgical-cases/${caseId}`);
        break;
      case 'theater':
        router.push(`/doctor/surgical-cases/${caseId}/intra-op`);
        break;
      case 'recovery':
        router.push(`/doctor/surgical-cases/${caseId}`);
        break;
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { variant: 'default' | 'outline' | 'secondary'; className: string }> = {
      PLANNING: { variant: 'secondary', className: 'bg-blue-50 text-blue-700 border-blue-200' },
      READY_FOR_SCHEDULING: { variant: 'default', className: 'bg-amber-100 text-amber-700 border-amber-200' },
      SCHEDULED: { variant: 'outline', className: 'bg-purple-50 text-purple-700 border-purple-200' },
      IN_PREP: { variant: 'outline', className: 'bg-orange-50 text-orange-700 border-orange-200' },
      READY_FOR_THEATER_BOOKING: { variant: 'default', className: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
      IN_THEATER: { variant: 'default', className: 'bg-blue-600 text-white' },
      RECOVERY: { variant: 'outline', className: 'bg-teal-50 text-teal-700 border-teal-200' },
      COMPLETED: { variant: 'outline', className: 'bg-slate-100 text-slate-600 border-slate-200' },
    };
    
    const config = statusConfig[status] || { variant: 'secondary', className: '' };
    return (
      <Badge variant={config.variant} className={cn('text-xs', config.className)}>
        {status.replace(/_/g, ' ')}
      </Badge>
    );
  };

  const renderCaseRow = (surgicalCase: any, tab: TabValue) => {
    const patientName = surgicalCase.patient 
      ? `${surgicalCase.patient.firstName} ${surgicalCase.patient.lastName}`
      : 'Unknown Patient';
    
    const daysInPlanning = Math.floor(
      (Date.now() - new Date(surgicalCase.createdAt).getTime()) / (1000 * 60 * 60 * 24)
    );

    return (
      <div
        key={surgicalCase.id}
        className="flex items-center justify-between p-3 hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-0"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-9 w-9 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
            <Scissors className="h-4 w-4 text-slate-500" />
          </div>
          <div className="min-w-0">
            <h4 className="text-sm font-medium text-slate-900 truncate">
              {patientName}
            </h4>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-slate-500 truncate max-w-[120px]">
                {surgicalCase.procedureName || 'No procedure'}
              </span>
              {tab === 'planning' && (
                <>
                  <span className="text-slate-300">•</span>
                  <span className="text-xs text-slate-400">
                    {daysInPlanning}d
                  </span>
                </>
              )}
              {tab === 'scheduled' && surgicalCase.theaterBooking && (
                <>
                  <span className="text-slate-300">•</span>
                  <span className="text-xs text-slate-500 flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {format(new Date(surgicalCase.theaterBooking.startTime), 'MMM d, HH:mm')}
                  </span>
                </>
              )}
              {tab === 'theater' && (
                <>
                  <span className="text-slate-300">•</span>
                  <span className="text-xs text-blue-600 flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Started {formatDistanceToNow(new Date(surgicalCase.updatedAt), { addSuffix: true })}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {getStatusBadge(surgicalCase.status)}
          
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleCaseAction(surgicalCase.id, tab)}
            className="text-xs h-8"
          >
            {tab === 'planning' && 'Continue Planning'}
            {tab === 'scheduled' && 'View Case'}
            {tab === 'theater' && 'Open Intra-Op'}
            {tab === 'recovery' && 'View Record'}
            <ArrowRight className="h-3 w-3 ml-1" />
          </Button>
        </div>
      </div>
    );
  };

  const renderEmptyState = (tab: TabValue) => {
    const emptyMessages: Record<TabValue, { title: string; description: string; icon: any }> = {
      planning: { 
        title: 'No cases in planning', 
        description: 'Cases requiring surgical planning will appear here',
        icon: FileText
      },
      scheduled: { 
        title: 'No scheduled cases', 
        description: 'Cases ready for or in pre-op will appear here',
        icon: Calendar
      },
      theater: { 
        title: 'No active surgeries', 
        description: 'Cases currently in theater will appear here',
        icon: Activity
      },
      recovery: { 
        title: 'No recovery cases', 
        description: 'Cases in recovery will appear here',
        icon: HeartPulse
      },
    };

    const { title, description, icon: Icon } = emptyMessages[tab];

    return (
      <div className="flex flex-col items-center justify-center py-10 text-center">
        <div className="h-10 w-10 bg-slate-100 rounded-full flex items-center justify-center mb-3">
          <Icon className="h-5 w-5 text-slate-300" />
        </div>
        <p className="text-sm font-medium text-slate-600">{title}</p>
        <p className="text-xs text-slate-400 mt-1">{description}</p>
      </div>
    );
  };

  const pipelineCases = {
    planning: pipeline.planning,
    scheduled: pipeline.scheduled,
    theater: pipeline.inTheater,
    recovery: pipeline.recovery,
  };

  return (
    <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabValue)} className="w-full">
      <TabsList className="w-full justify-start bg-slate-50 border-b rounded-none h-auto p-0">
        <TabsTrigger 
          value="planning" 
          className="flex items-center gap-2 px-4 py-2.5 rounded-t-lg data-[state=active]:bg-white data-[state=active]:shadow-sm"
        >
          <FileText className="h-3.5 w-3.5" />
          Planning
          {counts.planning > 0 && (
            <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">
              {counts.planning}
            </Badge>
          )}
        </TabsTrigger>
        <TabsTrigger 
          value="scheduled" 
          className="flex items-center gap-2 px-4 py-2.5 rounded-t-lg data-[state=active]:bg-white data-[state=active]:shadow-sm"
        >
          <Calendar className="h-3.5 w-3.5" />
          Scheduled
          {counts.scheduled > 0 && (
            <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">
              {counts.scheduled}
            </Badge>
          )}
        </TabsTrigger>
        <TabsTrigger 
          value="theater" 
          className="flex items-center gap-2 px-4 py-2.5 rounded-t-lg data-[state=active]:bg-white data-[state=active]:shadow-sm"
        >
          <Activity className="h-3.5 w-3.5" />
          In Theater
          {counts.inTheater > 0 && (
            <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">
              {counts.inTheater}
            </Badge>
          )}
        </TabsTrigger>
        <TabsTrigger 
          value="recovery" 
          className="flex items-center gap-2 px-4 py-2.5 rounded-t-lg data-[state=active]:bg-white data-[state=active]:shadow-sm"
        >
          <HeartPulse className="h-3.5 w-3.5" />
          Recovery
          {counts.recovery > 0 && (
            <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">
              {counts.recovery}
            </Badge>
          )}
        </TabsTrigger>
      </TabsList>

      <div className="bg-white border border-t-0 border-slate-200 rounded-b-xl">
        {isLoading ? (
          <div className="p-6 space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-14 bg-slate-50 animate-pulse rounded-lg" />
            ))}
          </div>
        ) : (
          <>
            <TabsContent value="planning" className="m-0">
              {pipelineCases.planning.length ? (
                pipelineCases.planning.map((surgicalCase) => renderCaseRow(surgicalCase, 'planning'))
              ) : renderEmptyState('planning')}
            </TabsContent>
            <TabsContent value="scheduled" className="m-0">
              {pipelineCases.scheduled.length ? (
                pipelineCases.scheduled.map((surgicalCase) => renderCaseRow(surgicalCase, 'scheduled'))
              ) : renderEmptyState('scheduled')}
            </TabsContent>
            <TabsContent value="theater" className="m-0">
              {pipelineCases.theater.length ? (
                pipelineCases.theater.map((surgicalCase) => renderCaseRow(surgicalCase, 'theater'))
              ) : renderEmptyState('theater')}
            </TabsContent>
            <TabsContent value="recovery" className="m-0">
              {pipelineCases.recovery.length ? (
                pipelineCases.recovery.map((surgicalCase) => renderCaseRow(surgicalCase, 'recovery'))
              ) : renderEmptyState('recovery')}
            </TabsContent>
          </>
        )}
      </div>
    </Tabs>
  );
}
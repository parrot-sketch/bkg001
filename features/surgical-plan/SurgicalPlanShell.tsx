/**
 * Surgical Plan Shell
 * 
 * Main container component for surgical plan page.
 * Loads data and renders tabs using the registry.
 * 
 * Phase 1: Enhanced with comprehensive case header and status progression.
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useSurgicalCasePlanPage } from './shared/hooks/useSurgicalCasePlanPage';
import { LoadingState } from './shared/components/LoadingState';
import { ErrorState } from './shared/components/ErrorState';
import { getTabsForRole } from './core/tabRegistry';
import { Role } from '@/domain/enums/Role';
import { cn } from '@/lib/utils';
import { CompletePlanButton } from './components/CompletePlanButton';
import { 
  ClipboardList, 
  ArrowRight, 
  User, 
  Calendar, 
  Clock, 
  AlertCircle,
  FileText,
  Stethoscope
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { STATUS_CONFIG, READINESS_CONFIG } from './core/constants';

interface SurgicalPlanShellProps {
  caseId: string;
  userRole?: Role; // TODO: Get from auth context in Phase 2
}

export function SurgicalPlanShell({
  caseId,
  userRole = Role.DOCTOR, // Default for Phase 1
}: SurgicalPlanShellProps) {
  const router = useRouter();
  const { isLoading, error, data, refetch, canEdit } = useSurgicalCasePlanPage(caseId);
  const [activeTab, setActiveTab] = useState('overview');

  if (isLoading) {
    return <LoadingState />;
  }

  if (error || !data) {
    return <ErrorState error={error || 'Case not found'} onRetry={refetch} />;
  }

  const tabs = getTabsForRole(userRole, data);
  const isInTheater = data.case.status === 'IN_THEATER' || data.case.status === 'RECOVERY';
  const statusConfig = STATUS_CONFIG[data.case.status] ?? STATUS_CONFIG.DRAFT;
  const readinessConfig = READINESS_CONFIG[data.casePlan?.readinessStatus ?? 'NOT_STARTED'] ?? READINESS_CONFIG.NOT_STARTED;

  return (
    <div className="space-y-5 pb-16">
      {/* ═══ CASE HEADER ═══ */}
      <div className="rounded-lg border border-stone-200 bg-white overflow-hidden">
        {/* Top Bar: Patient + Status */}
        <div className="p-4 border-b border-stone-100">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              {data.patient && (
                <>
                  <div className="h-10 w-10 rounded-full bg-stone-100 flex items-center justify-center text-xs font-bold text-stone-600 shrink-0">
                    {data.patient.fullName
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <h1 className="text-base font-semibold text-stone-900 truncate">{data.patient.fullName}</h1>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      {data.patient.fileNumber && (
                        <span className="text-[10px] font-mono text-stone-400">{data.patient.fileNumber}</span>
                      )}
                      {data.patient.age && (
                        <span className="text-[10px] text-stone-400">{data.patient.age}</span>
                      )}
                      {data.patient.gender && (
                        <span className="text-[10px] text-stone-400 capitalize">{data.patient.gender.toLowerCase()}</span>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Badge variant={readinessConfig.variant} className="text-[10px]">
                {readinessConfig.label}
              </Badge>
              <Badge variant="outline" className={`text-[10px] ${statusConfig.className}`}>
                {statusConfig.label}
              </Badge>
            </div>
          </div>
        </div>

        {/* Case Details Row */}
        <div className="px-4 py-3 bg-stone-50/50 border-b border-stone-100">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
            {/* Procedure */}
            <div className="flex items-center gap-2">
              <Stethoscope className="h-3.5 w-3.5 text-stone-400 shrink-0" />
              <div className="min-w-0">
                <p className="text-[10px] text-stone-400 uppercase tracking-wide">Procedure</p>
                <p className="text-sm font-medium text-stone-700 truncate">
                  {data.case.procedureName || 'Not specified'}
                </p>
              </div>
            </div>

            {/* Diagnosis */}
            <div className="flex items-center gap-2">
              <FileText className="h-3.5 w-3.5 text-stone-400 shrink-0" />
              <div className="min-w-0">
                <p className="text-[10px] text-stone-400 uppercase tracking-wide">Diagnosis</p>
                <p className="text-sm font-medium text-stone-700 truncate">
                  {data.case.diagnosis || 'Not specified'}
                </p>
              </div>
            </div>

            {/* Primary Surgeon */}
            <div className="flex items-center gap-2">
              <User className="h-3.5 w-3.5 text-stone-400 shrink-0" />
              <div className="min-w-0">
                <p className="text-[10px] text-stone-400 uppercase tracking-wide">Primary Surgeon</p>
                <p className="text-sm font-medium text-stone-700 truncate">
                  {data.primarySurgeon?.name || 'Not assigned'}
                </p>
              </div>
            </div>

            {/* Duration / Booking */}
            <div className="flex items-center gap-2">
              {data.theaterBooking ? (
                <>
                  <Calendar className="h-3.5 w-3.5 text-stone-400 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[10px] text-stone-400 uppercase tracking-wide">Scheduled</p>
                    <p className="text-sm font-medium text-stone-700 truncate">
                      {format(parseISO(data.theaterBooking.startTime), 'MMM d, HH:mm')}
                      {data.theaterBooking.theaterName && ` — ${data.theaterBooking.theaterName}`}
                    </p>
                  </div>
                </>
              ) : data.casePlan?.estimatedDurationMinutes ? (
                <>
                  <Clock className="h-3.5 w-3.5 text-stone-400 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[10px] text-stone-400 uppercase tracking-wide">Est. Duration</p>
                    <p className="text-sm font-medium text-stone-700 truncate">
                      {data.casePlan.estimatedDurationMinutes} minutes
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <Clock className="h-3.5 w-3.5 text-stone-400 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[10px] text-stone-400 uppercase tracking-wide">Duration</p>
                    <p className="text-sm font-medium text-stone-400 truncate">Not specified</p>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Actions Row */}
        {(userRole === Role.DOCTOR && (data.case.status === 'PLANNING' || data.case.status === 'DRAFT')) || isInTheater ? (
          <div className="p-4 flex items-center justify-end gap-3">
            {userRole === Role.DOCTOR && (data.case.status === 'PLANNING' || data.case.status === 'DRAFT') && (
              <CompletePlanButton caseId={caseId} />
            )}
            {userRole === Role.DOCTOR && isInTheater && (
              <Button 
                className="bg-stone-900 hover:bg-black"
                onClick={() => router.push(`/doctor/surgical-cases/${caseId}/intra-op`)}
              >
                <ClipboardList className="h-4 w-4 mr-2" />
                Fill Operative Record
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            )}
          </div>
        ) : null}
      </div>

      {/* ═══ TABS ═══ */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full justify-start gap-1 p-1 bg-stone-50 rounded-lg h-auto border border-stone-200">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const badgeCount = tab.badgeCount?.(data);
            return (
              <TabsTrigger
                key={tab.key}
                value={tab.key}
                className={cn(
                  'flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
                  'data-[state=active]:bg-white data-[state=active]:text-stone-900'
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{tab.label}</span>
                {badgeCount !== undefined && badgeCount > 0 && (
                  <span className="ml-1 rounded-full bg-stone-200 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-stone-600">
                    {badgeCount}
                  </span>
                )}
              </TabsTrigger>
            );
          })}
        </TabsList>

        <div className="mt-4 rounded-lg border border-stone-200 bg-white overflow-hidden">
          {tabs.map((tab) => {
            const TabComponent = tab.component;
            return (
              <TabsContent
                key={tab.key}
                value={tab.key}
                className="m-0 p-5 sm:p-6 lg:p-8"
              >
                <TabComponent caseId={caseId} readOnly={!canEdit} />
              </TabsContent>
            );
          })}
        </div>
      </Tabs>
    </div>
  );
}

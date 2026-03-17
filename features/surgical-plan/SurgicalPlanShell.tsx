/**
 * Surgical Plan Shell
 * 
 * Main container component for surgical plan page.
 * Loads data and renders tabs using the registry.
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { useSurgicalCasePlanPage } from './shared/hooks/useSurgicalCasePlanPage';
import { LoadingState } from './shared/components/LoadingState';
import { ErrorState } from './shared/components/ErrorState';
import { getTabsForRole } from './core/tabRegistry';
import { Role } from '@/domain/enums/Role';
import { cn } from '@/lib/utils';
import { CompletePlanButton } from './components/CompletePlanButton';
import { ClipboardList, ArrowRight } from 'lucide-react';

interface SurgicalPlanShellProps {
  caseId: string;
  userRole?: Role; // TODO: Get from auth context in Phase 2
}

export function SurgicalPlanShell({
  caseId,
  userRole = Role.DOCTOR, // Default for Phase 1
}: SurgicalPlanShellProps) {
  const router = useRouter();
  const { isLoading, error, data, refetch } = useSurgicalCasePlanPage(caseId);
  const [activeTab, setActiveTab] = useState('overview');

  if (isLoading) {
    return <LoadingState />;
  }

  if (error || !data) {
    return <ErrorState error={error || 'Case not found'} onRetry={refetch} />;
  }

  const tabs = getTabsForRole(userRole, data);
  const isInTheater = data.case.status === 'IN_THEATER' || data.case.status === 'RECOVERY';

  return (
    <div className="space-y-5 animate-in fade-in duration-500 pb-16">
      {/* Patient Context Bar - Placeholder for Phase 2 */}
      <div className="rounded-xl border bg-card shadow-sm p-4">
        <div className="flex items-center gap-4">
          {data.patient && (
            <>
              <div className="h-11 w-11 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold">
                {data.patient.fullName
                  .split(' ')
                  .map((n) => n[0])
                  .join('')
                  .toUpperCase()}
              </div>
              <div>
                <h1 className="text-lg font-bold">{data.patient.fullName}</h1>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-sm text-muted-foreground">
                    {data.case.procedureName || 'No procedure specified'}
                  </p>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium border border-slate-200">
                    {data.case.status}
                  </span>
                </div>
              </div>
            </>
          )}
        </div>
        
        {/* Actions Area */}
        {userRole === Role.DOCTOR && (data.case.status === 'PLANNING' || data.case.status === 'DRAFT') && (
          <div className="flex-shrink-0 mt-4">
             <CompletePlanButton caseId={caseId} />
          </div>
        )}

        {/* Doctor Intra-Op Record Action - Show when case is in theater */}
        {userRole === Role.DOCTOR && isInTheater && (
          <div className="flex-shrink-0 mt-4">
            <Button 
              className="w-full md:w-auto bg-red-600 hover:bg-red-700"
              onClick={() => router.push(`/doctor/surgical-cases/${caseId}/intra-op`)}
            >
              <ClipboardList className="h-4 w-4 mr-2" />
              Fill Operative Record
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        )}
      </div>

      {/* Tabbed Workspace */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full justify-start gap-1 p-1 bg-muted/40 rounded-lg h-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const badgeCount = tab.badgeCount?.(data);
            return (
              <TabsTrigger
                key={tab.key}
                value={tab.key}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all',
                  'data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-foreground'
                )}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{tab.label}</span>
                {badgeCount !== undefined && badgeCount > 0 && (
                  <span className="ml-1 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold leading-none">
                    {badgeCount}
                  </span>
                )}
              </TabsTrigger>
            );
          })}
        </TabsList>

        <div className="mt-4 rounded-xl border bg-card shadow-sm overflow-hidden">
          {tabs.map((tab) => {
            const TabComponent = tab.component;
            return (
              <TabsContent
                key={tab.key}
                value={tab.key}
                className="m-0 p-5 sm:p-6 lg:p-8"
              >
                <TabComponent caseId={caseId} />
              </TabsContent>
            );
          })}
        </div>
      </Tabs>
    </div>
  );
}

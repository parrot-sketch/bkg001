'use client';

/**
 * Optimized Consultation Workspace
 * 
 * Refactored workspace with:
 * - Context-based state management (no prop drilling)
 * - Lazy-loaded tab content
 * - Minimal re-renders via memoization
 * - Keyboard shortcuts for power users
 * 
 * This is the main editing area where doctors document consultations.
 */

import { useState, useCallback, useMemo, memo } from 'react';
import dynamic from 'next/dynamic';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  FileText, 
  Stethoscope, 
  ClipboardCheck, 
  CalendarPlus,
  ChevronLeft,
  ChevronRight,
  Save,
  CheckCircle,
  Receipt,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useConsultationContext, type StructuredNotes } from '@/contexts/ConsultationContext';
import { LazyTab } from './LazyTab';
import { toast } from 'sonner';

// ============================================================================
// LAZY LOADED TAB COMPONENTS
// ============================================================================

// Dynamic imports for heavy components (rich text editors)
const PatientGoalsTab = dynamic(
  () => import('./tabs/PatientGoalsTab').then(mod => ({ default: mod.PatientGoalsTab })),
  { 
    loading: () => <TabSkeleton />,
    ssr: false 
  }
);

const ExaminationTab = dynamic(
  () => import('./tabs/ExaminationTab').then(mod => ({ default: mod.ExaminationTab })),
  { 
    loading: () => <TabSkeleton />,
    ssr: false 
  }
);

const RecommendationsTab = dynamic(
  () => import('./tabs/RecommendationsTab').then(mod => ({ default: mod.RecommendationsTab })),
  { 
    loading: () => <TabSkeleton />,
    ssr: false 
  }
);

const TreatmentPlanTab = dynamic(
  () => import('./tabs/TreatmentPlanTab').then(mod => ({ default: mod.TreatmentPlanTab })),
  { 
    loading: () => <TabSkeleton />,
    ssr: false 
  }
);

const BillingTab = dynamic(
  () => import('./tabs/BillingTab').then(mod => ({ default: mod.BillingTab })),
  { 
    loading: () => <TabSkeleton />,
    ssr: false 
  }
);

// ============================================================================
// TAB CONFIGURATION
// ============================================================================

interface TabConfig {
  id: string;
  label: string;
  shortLabel: string;
  icon: React.ComponentType<{ className?: string }>;
  noteField: keyof StructuredNotes | null;
}

const TABS: TabConfig[] = [
  { id: 'chief', label: 'Chief Complaint', shortLabel: 'Chief', icon: FileText, noteField: 'chiefComplaint' },
  { id: 'exam', label: 'Examination', shortLabel: 'Exam', icon: Stethoscope, noteField: 'examination' },
  { id: 'assessment', label: 'Assessment', shortLabel: 'Assess', icon: ClipboardCheck, noteField: 'assessment' },
  { id: 'plan', label: 'Treatment Plan', shortLabel: 'Plan', icon: CalendarPlus, noteField: 'plan' },
  { id: 'billing', label: 'Billing', shortLabel: 'Billing', icon: Receipt, noteField: null },
];

// ============================================================================
// COMPONENTS
// ============================================================================

const TabSkeleton = memo(function TabSkeleton() {
  return (
    <div className="space-y-4 p-4">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
});

const TabButton = memo(function TabButton({
  tab,
  isActive,
  onClick,
}: {
  tab: TabConfig;
  isActive: boolean;
  onClick: () => void;
}) {
  const Icon = tab.icon;
  
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all',
        isActive
          ? 'bg-slate-900 text-white shadow-sm'
          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
      )}
    >
      <Icon className="h-4 w-4" />
      <span className="hidden sm:inline">{tab.shortLabel}</span>
    </button>
  );
});

export function ConsultationWorkspaceOptimized() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const {
    state,
    isActive,
    isReadOnly,
    canSave,
    canComplete,
    saveDraft,
    updateNotes,
    setOutcome,
    openCompleteDialog,
  } = useConsultationContext();
  
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'chief');
  
  // Get current tab index
  const currentTabIndex = useMemo(() => 
    TABS.findIndex(t => t.id === activeTab),
    [activeTab]
  );
  
  // Navigation handlers
  const handleTabChange = useCallback((tabId: string) => {
    setActiveTab(tabId);
    // Update URL without navigation
    router.replace(`?tab=${tabId}`, { scroll: false });
  }, [router]);
  
  const handlePrevious = useCallback(() => {
    if (currentTabIndex > 0) {
      handleTabChange(TABS[currentTabIndex - 1].id);
    }
  }, [currentTabIndex, handleTabChange]);
  
  const handleNext = useCallback(() => {
    if (currentTabIndex < TABS.length - 1) {
      handleTabChange(TABS[currentTabIndex + 1].id);
    }
  }, [currentTabIndex, handleTabChange]);
  
  // Save handler
  const handleSave = useCallback(async () => {
    if (!canSave) return;
    await saveDraft();
    toast.success('Draft saved');
  }, [canSave, saveDraft]);
  
  // Note update handler (passed to tabs)
  const handleNoteChange = useCallback((field: keyof StructuredNotes) => (value: string) => {
    updateNotes(field, value);
  }, [updateNotes]);
  
  const isLastTab = currentTabIndex === TABS.length - 1;
  const isFirstTab = currentTabIndex === 0;
  
  return (
    <div className="flex flex-col h-full bg-white">
      {/* Tab Navigation Bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-slate-50/50">
        <div className="flex items-center gap-1">
          {TABS.map((tab) => (
            <TabButton
              key={tab.id}
              tab={tab}
              isActive={activeTab === tab.id}
              onClick={() => handleTabChange(tab.id)}
            />
          ))}
        </div>
        
        {/* Save Status Indicator */}
        <div className="flex items-center gap-2">
          {state.autoSaveStatus === 'saving' && (
            <span className="text-xs text-slate-400 animate-pulse">Saving...</span>
          )}
          {state.autoSaveStatus === 'saved' && (
            <span className="text-xs text-emerald-600 flex items-center gap-1">
              <CheckCircle className="h-3 w-3" />
              Saved
            </span>
          )}
          {state.autoSaveStatus === 'error' && (
            <span className="text-xs text-red-500">Save failed</span>
          )}
        </div>
      </div>
      
      {/* Tab Content Area */}
      <div className="flex-1 overflow-y-auto">
        <Tabs value={activeTab} className="h-full">
          {/* Chief Complaint */}
          <TabsContent value="chief" className="mt-0 h-full p-0">
            <LazyTab isActive={activeTab === 'chief'}>
              <PatientGoalsTab
                initialValue={state.notes.chiefComplaint || ''}
                onChange={handleNoteChange('chiefComplaint')}
                isReadOnly={isReadOnly}
              />
            </LazyTab>
          </TabsContent>
          
          {/* Examination */}
          <TabsContent value="exam" className="mt-0 h-full p-0">
            <LazyTab isActive={activeTab === 'exam'}>
              <ExaminationTab
                initialValue={state.notes.examination || ''}
                onChange={handleNoteChange('examination')}
                isReadOnly={isReadOnly}
              />
            </LazyTab>
          </TabsContent>
          
          {/* Assessment */}
          <TabsContent value="assessment" className="mt-0 h-full p-0">
            <LazyTab isActive={activeTab === 'assessment'}>
              <RecommendationsTab
                consultation={state.consultation}
                onOutcomeChange={setOutcome}
                onAssessmentChange={handleNoteChange('assessment')}
                isReadOnly={isReadOnly}
              />
            </LazyTab>
          </TabsContent>
          
          {/* Treatment Plan */}
          <TabsContent value="plan" className="mt-0 h-full p-0">
            <LazyTab isActive={activeTab === 'plan'}>
              <TreatmentPlanTab
                consultation={state.consultation}
                hasCasePlan={state.consultation?.hasCasePlan || false}
                onPlanChange={handleNoteChange('plan')}
                isReadOnly={isReadOnly}
              />
            </LazyTab>
          </TabsContent>

          {/* Billing — always editable by the doctor, even after consultation is completed.
              Editability is determined by payment status inside the BillingTab itself. */}
          <TabsContent value="billing" className="mt-0 h-full p-0">
            <LazyTab isActive={activeTab === 'billing'}>
              <BillingTab
                appointmentId={state.appointment?.id}
                isReadOnly={false}
              />
            </LazyTab>
          </TabsContent>
        </Tabs>
      </div>
      
      {/* Navigation Footer */}
      <div className="border-t bg-white px-4 py-3 flex items-center justify-between">
        <Button
          variant="outline"
          onClick={handlePrevious}
          disabled={isFirstTab}
          className="gap-2"
        >
          <ChevronLeft className="h-4 w-4" />
          Previous
        </Button>
        
        <div className="flex items-center gap-3">
          {/* Progress Dots */}
          <div className="hidden sm:flex items-center gap-1.5">
            {TABS.map((tab, index) => (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={cn(
                  'h-2 w-2 rounded-full transition-all',
                  index === currentTabIndex
                    ? 'bg-slate-900 w-4'
                    : index < currentTabIndex
                      ? 'bg-emerald-500'
                      : 'bg-slate-300'
                )}
              />
            ))}
          </div>
          
          {/* Auto-save indicator in center */}
          {state.workflow.isDirty && !state.isSaving && (
            <span className="text-xs text-amber-600 font-medium">Unsaved changes</span>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {/* Always show Save button (subtle on non-last tabs) */}
          {!isLastTab && state.workflow.isDirty && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSave}
              disabled={!canSave || state.isSaving}
              className="gap-1 text-slate-500 hover:text-slate-900"
            >
              <Save className="h-3.5 w-3.5" />
              Save
            </Button>
          )}
          
          {isLastTab ? (
            <>
              <Button
                variant="outline"
                onClick={handleSave}
                disabled={!canSave || state.isSaving}
                className="gap-2"
              >
                <Save className="h-4 w-4" />
                Save
              </Button>
              <Button
                onClick={openCompleteDialog}
                disabled={!canComplete}
                className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
              >
                <CheckCircle className="h-4 w-4" />
                Complete
              </Button>
            </>
          ) : (
            <Button onClick={handleNext} className="gap-2">
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

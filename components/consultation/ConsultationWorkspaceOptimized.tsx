'use client';

/**
 * Optimized Consultation Workspace
 * 
 * Premium clinical documentation workspace with:
 * - Step-based navigation with visual progress
 * - Context-based state management (no prop drilling)
 * - Lazy-loaded tab content for performance
 * - Keyboard shortcuts for power users
 * - Responsive layout with proper content areas
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
  Check,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useConsultationContext, type StructuredNotes } from '@/contexts/ConsultationContext';
import { LazyTab } from './LazyTab';
import { toast } from 'sonner';

// ============================================================================
// LAZY LOADED TAB COMPONENTS
// ============================================================================

const PatientGoalsTab = dynamic(
  () => import('./tabs/PatientGoalsTab').then(mod => ({ default: mod.PatientGoalsTab })),
  {
    loading: () => <TabSkeleton />,
    ssr: false,
  }
);

const ExaminationTab = dynamic(
  () => import('./tabs/ExaminationTab').then(mod => ({ default: mod.ExaminationTab })),
  {
    loading: () => <TabSkeleton />,
    ssr: false,
  }
);

const RecommendationsTab = dynamic(
  () => import('./tabs/RecommendationsTab').then(mod => ({ default: mod.RecommendationsTab })),
  {
    loading: () => <TabSkeleton />,
    ssr: false,
  }
);

const TreatmentPlanTab = dynamic(
  () => import('./tabs/TreatmentPlanTab').then(mod => ({ default: mod.TreatmentPlanTab })),
  {
    loading: () => <TabSkeleton />,
    ssr: false,
  }
);

const BillingTab = dynamic(
  () => import('./tabs/BillingTab').then(mod => ({ default: mod.BillingTab })),
  {
    loading: () => <TabSkeleton />,
    ssr: false,
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
  description: string;
}

const TABS: TabConfig[] = [
  {
    id: 'chief',
    label: 'Chief Complaint',
    shortLabel: 'Chief',
    icon: FileText,
    noteField: 'chiefComplaint',
    description: 'Primary concern & goals',
  },
  {
    id: 'exam',
    label: 'Examination',
    shortLabel: 'Exam',
    icon: Stethoscope,
    noteField: 'examination',
    description: 'Physical findings',
  },
  {
    id: 'assessment',
    label: 'Assessment',
    shortLabel: 'Assess',
    icon: ClipboardCheck,
    noteField: 'assessment',
    description: 'Clinical assessment',
  },
  {
    id: 'plan',
    label: 'Treatment Plan',
    shortLabel: 'Plan',
    icon: CalendarPlus,
    noteField: 'plan',
    description: 'Plan & next steps',
  },
  {
    id: 'billing',
    label: 'Billing',
    shortLabel: 'Billing',
    icon: Receipt,
    noteField: null,
    description: 'Services & billing',
  },
];

// ============================================================================
// SKELETON
// ============================================================================

const TabSkeleton = memo(function TabSkeleton() {
  return (
    <div className="space-y-4 p-6">
      <Skeleton className="h-6 w-40" />
      <Skeleton className="h-3 w-64" />
      <Skeleton className="h-64 w-full rounded-xl" />
    </div>
  );
});

// ============================================================================
// STEP NAVIGATION
// ============================================================================

const StepNav = memo(function StepNav({
  tabs,
  activeIndex,
  completedFields,
  onTabChange,
}: {
  tabs: TabConfig[];
  activeIndex: number;
  completedFields: Set<string>;
  onTabChange: (id: string) => void;
}) {
  return (
    <div className="border-b bg-slate-50/80">
      {/* Desktop: Full step navigation */}
      <div className="hidden md:flex items-center px-2 py-2">
        {tabs.map((tab, index) => {
          const Icon = tab.icon;
          const isActive = index === activeIndex;
          const isComplete = tab.noteField ? completedFields.has(tab.noteField) : false;
          const isPast = index < activeIndex;

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                'group relative flex items-center gap-2 px-4 py-2.5 rounded-lg transition-all text-left flex-1 min-w-0',
                isActive
                  ? 'bg-white shadow-sm ring-1 ring-slate-200/80'
                  : 'hover:bg-white/60',
              )}
            >
              {/* Step indicator */}
              <div className={cn(
                'flex items-center justify-center h-7 w-7 rounded-full shrink-0 text-xs font-semibold transition-all',
                isActive
                  ? 'bg-slate-900 text-white'
                  : isComplete
                    ? 'bg-emerald-100 text-emerald-700'
                    : isPast
                      ? 'bg-slate-200 text-slate-600'
                      : 'bg-slate-100 text-slate-400',
              )}>
                {isComplete ? (
                  <Check className="h-3.5 w-3.5" />
                ) : (
                  <Icon className="h-3.5 w-3.5" />
                )}
              </div>

              <div className="min-w-0">
                <p className={cn(
                  'text-xs font-semibold truncate transition-colors',
                  isActive ? 'text-slate-900' : 'text-slate-600 group-hover:text-slate-800',
                )}>
                  {tab.shortLabel}
                </p>
                <p className={cn(
                  'text-[10px] truncate transition-colors',
                  isActive ? 'text-slate-500' : 'text-slate-400',
                )}>
                  {tab.description}
                </p>
              </div>

              {/* Connector line */}
              {index < tabs.length - 1 && (
                <div className={cn(
                  'absolute right-0 top-1/2 -translate-y-1/2 w-px h-5',
                  'bg-slate-200',
                )} />
              )}
            </button>
          );
        })}
      </div>

      {/* Mobile: Compact pills */}
      <div className="flex md:hidden items-center gap-1 px-3 py-2 overflow-x-auto">
        {tabs.map((tab, index) => {
          const Icon = tab.icon;
          const isActive = index === activeIndex;
          const isComplete = tab.noteField ? completedFields.has(tab.noteField) : false;

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium shrink-0 transition-all',
                isActive
                  ? 'bg-slate-900 text-white shadow-sm'
                  : isComplete
                    ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                    : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700',
              )}
            >
              {isComplete && !isActive ? (
                <Check className="h-3 w-3" />
              ) : (
                <Icon className="h-3 w-3" />
              )}
              {tab.shortLabel}
            </button>
          );
        })}
      </div>
    </div>
  );
});

// ============================================================================
// MAIN COMPONENT
// ============================================================================

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
    setPatientDecision,
    openCompleteDialog,
  } = useConsultationContext();

  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'chief');

  // Current tab index
  const currentTabIndex = useMemo(
    () => TABS.findIndex(t => t.id === activeTab),
    [activeTab],
  );

  // Track which note fields have content (for completion indicators)
  const completedFields = useMemo(() => {
    const fields = new Set<string>();
    const notes = state.notes;
    if (notes.chiefComplaint && notes.chiefComplaint.replace(/<[^>]*>/g, '').trim().length > 0) fields.add('chiefComplaint');
    if (notes.examination && notes.examination.replace(/<[^>]*>/g, '').trim().length > 0) fields.add('examination');
    if (notes.assessment && notes.assessment.replace(/<[^>]*>/g, '').trim().length > 0) fields.add('assessment');
    if (notes.plan && notes.plan.replace(/<[^>]*>/g, '').trim().length > 0) fields.add('plan');
    return fields;
  }, [state.notes]);

  // Navigation handlers
  const handleTabChange = useCallback((tabId: string) => {
    setActiveTab(tabId);
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

  // Note update handler (curried, passed to tabs)
  const handleNoteChange = useCallback(
    (field: keyof StructuredNotes) => (value: string) => {
      updateNotes(field, value);
    },
    [updateNotes],
  );

  const isLastTab = currentTabIndex === TABS.length - 1;
  const isFirstTab = currentTabIndex === 0;
  const currentTab = TABS[currentTabIndex];

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Step Navigation */}
      <StepNav
        tabs={TABS}
        activeIndex={currentTabIndex}
        completedFields={completedFields}
        onTabChange={handleTabChange}
      />

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
                currentOutcome={state.outcomeType}
                currentPatientDecision={state.patientDecision}
                onOutcomeChange={setOutcome}
                onPatientDecisionChange={setPatientDecision}
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

          {/* Billing */}
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

      {/* ─── Navigation Footer ─── */}
      <div className="border-t bg-white/95 backdrop-blur-sm px-4 lg:px-6 py-3">
        <div className="flex items-center justify-between">
          {/* Left: Previous */}
          <Button
            variant="ghost"
            onClick={handlePrevious}
            disabled={isFirstTab}
            className="gap-1.5 text-slate-600 hover:text-slate-900"
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Previous</span>
          </Button>

          {/* Center: Progress + Save status */}
          <div className="flex items-center gap-4">
            {/* Step counter */}
            <span className="text-xs text-slate-400 font-medium">
              {currentTabIndex + 1} / {TABS.length}
            </span>

            {/* Progress bar */}
            <div className="hidden sm:flex items-center gap-1">
              {TABS.map((tab, index) => (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  aria-label={tab.label}
                  className={cn(
                    'h-1.5 rounded-full transition-all',
                    index === currentTabIndex
                      ? 'w-6 bg-slate-900'
                      : tab.noteField && completedFields.has(tab.noteField)
                        ? 'w-3 bg-emerald-400'
                        : index < currentTabIndex
                          ? 'w-3 bg-slate-300'
                          : 'w-3 bg-slate-200',
                  )}
                />
              ))}
            </div>

            {/* Unsaved indicator */}
            {state.workflow.isDirty && !state.isSaving && (
              <span className="text-[11px] text-amber-600 font-medium hidden sm:block">
                Unsaved changes
              </span>
            )}
          </div>

          {/* Right: Next / Save / Complete */}
          <div className="flex items-center gap-2">
            {/* Contextual save */}
            {!isLastTab && state.workflow.isDirty && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSave}
                disabled={!canSave || state.isSaving}
                className="gap-1 text-slate-500 hover:text-slate-900 hidden sm:flex"
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
                  className="gap-1.5"
                >
                  {state.isSaving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  <span className="hidden sm:inline">Save</span>
                </Button>
                <Button
                  onClick={openCompleteDialog}
                  disabled={!canComplete}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 shadow-sm"
                >
                  <CheckCircle className="h-4 w-4" />
                  <span className="hidden sm:inline">Complete</span>
                </Button>
              </>
            ) : (
              <Button
                onClick={handleNext}
                className="gap-1.5 bg-slate-900 hover:bg-slate-800 text-white"
              >
                <span className="hidden sm:inline">Next</span>
                <ChevronRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

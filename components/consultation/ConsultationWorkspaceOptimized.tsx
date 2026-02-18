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

import { motion, AnimatePresence } from 'framer-motion';
import { use, Suspense, useState, useCallback, useMemo, memo } from 'react';
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
    <div className="bg-white/50 backdrop-blur-md border-b border-slate-200">
      {/* Desktop: Full step navigation */}
      <div className="hidden md:flex items-center px-4 py-3 gap-2 max-w-[1200px] mx-auto">
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
                'group relative flex items-center gap-3 px-4 py-2 rounded-xl transition-all text-left flex-1 min-w-0 border',
                isActive
                  ? 'bg-indigo-600/5 border-indigo-200 shadow-sm'
                  : 'bg-transparent border-transparent hover:bg-slate-100/80',
              )}
            >
              {/* Step indicator */}
              <div className={cn(
                'flex items-center justify-center h-8 w-8 rounded-lg shrink-0 text-xs font-bold transition-all duration-300',
                isActive
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : isComplete
                    ? 'bg-emerald-100 text-emerald-600'
                    : isPast
                      ? 'bg-slate-100 text-slate-500'
                      : 'bg-slate-50 text-slate-400',
              )}>
                {isComplete ? (
                  <Check className="h-4 w-4 stroke-[3]" />
                ) : (
                  <Icon className="h-4 w-4" />
                )}
              </div>

              <div className="min-w-0">
                <p className={cn(
                  'text-[11px] font-bold uppercase tracking-widest truncate transition-colors font-bold',
                  isActive ? 'text-indigo-600' : 'text-slate-500 group-hover:text-slate-900',
                )}>
                  {tab.shortLabel}
                </p>
                <p className={cn(
                  'text-[10px] truncate transition-colors font-medium',
                  isActive ? 'text-slate-600' : 'text-slate-400 group-hover:text-slate-600',
                )}>
                  {tab.description}
                </p>
              </div>

              {isActive && (
                <motion.div
                  layoutId="step-indicator"
                  className="absolute -bottom-[1px] left-4 right-4 h-0.5 bg-indigo-600 rounded-full"
                />
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
    <div className="flex flex-col h-full bg-slate-50/50 overflow-hidden">
      {/* Step Navigation - Fixed at top of workspace column */}
      <div className="bg-white/60 backdrop-blur-md border-b border-slate-200 px-6 shrink-0 z-20 shadow-sm">
        <StepNav
          tabs={TABS}
          activeIndex={currentTabIndex}
          completedFields={completedFields}
          onTabChange={handleTabChange}
        />
      </div>

      {/* Tab Content Area - The only scrollable part of the workspace */}
      <div className="flex-1 overflow-y-auto custom-scrollbar-light relative">
        <Tabs value={activeTab} className="h-full">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="h-full p-6 lg:p-8"
            >
              <div className="max-w-[1000px] mx-auto h-full">
                {/* Chief Complaint */}
                <TabsContent value="chief" className="m-0 h-full border-none shadow-none bg-transparent">
                  <LazyTab isActive={activeTab === 'chief'}>
                    <PatientGoalsTab
                      initialValue={state.notes.chiefComplaint || ''}
                      onChange={handleNoteChange('chiefComplaint')}
                      isReadOnly={isReadOnly}
                    />
                  </LazyTab>
                </TabsContent>

                {/* Examination */}
                <TabsContent value="exam" className="m-0 h-full border-none shadow-none bg-transparent">
                  <LazyTab isActive={activeTab === 'exam'}>
                    <ExaminationTab
                      initialValue={state.notes.examination || ''}
                      onChange={handleNoteChange('examination')}
                      isReadOnly={isReadOnly}
                    />
                  </LazyTab>
                </TabsContent>

                {/* Assessment */}
                <TabsContent value="assessment" className="m-0 h-full border-none shadow-none bg-transparent">
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
                <TabsContent value="plan" className="m-0 h-full border-none shadow-none bg-transparent">
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
                <TabsContent value="billing" className="m-0 h-full border-none shadow-none bg-transparent">
                  <LazyTab isActive={activeTab === 'billing'}>
                    <BillingTab
                      appointmentId={state.appointment?.id}
                      isReadOnly={false}
                    />
                  </LazyTab>
                </TabsContent>
              </div>
            </motion.div>
          </AnimatePresence>
        </Tabs>
      </div>

      {/* ─── Sticky Footer Navigation ─── */}
      <div className="border-t border-white/5 bg-slate-950/40 backdrop-blur-xl px-6 py-4 flex items-center justify-between z-20">
        <motion.div whileHover={{ x: -2 }} whileTap={{ scale: 0.98 }}>
          <Button
            variant="ghost"
            onClick={handlePrevious}
            disabled={isFirstTab}
            className="text-slate-500 hover:text-white hover:bg-white/5 gap-2 px-4 transition-all"
          >
            <ChevronLeft className="h-4 w-4" />
            Previous Section
          </Button>
        </motion.div>

        {/* Center: Progress + Save status */}
        <div className="flex items-center gap-4">
          {/* Step counter */}
          <span className="text-xs text-slate-500 font-bold tracking-tight uppercase tracking-[0.2em] hidden sm:block">
            STEP {currentTabIndex + 1} OF {TABS.length}
          </span>

          {/* Progress bar */}
          <div className="hidden sm:flex items-center gap-2">
            {TABS.map((tab, index) => (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                aria-label={tab.label}
                className={cn(
                  'h-1.5 rounded-full transition-all duration-300',
                  index === currentTabIndex
                    ? 'w-10 bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.5)]'
                    : tab.noteField && completedFields.has(tab.noteField)
                      ? 'w-3 bg-emerald-500/50'
                      : index < currentTabIndex
                        ? 'w-3 bg-slate-700'
                        : 'w-3 bg-slate-800',
                )}
              />
            ))}
          </div>

          <AnimatePresence>
            {state.workflow.isDirty && !state.isSaving && (
              <motion.span
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="text-[10px] text-amber-500 font-bold uppercase tracking-widest hidden lg:block"
              >
                UNSAVED
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        {/* Right: Next / Save / Complete */}
        <div className="flex items-center gap-3">
          {/* Contextual save */}
          {!isLastTab && state.workflow.isDirty && (
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSave}
                disabled={!canSave || state.isSaving}
                className="h-9 gap-2 text-slate-400 hover:text-white hidden sm:flex font-bold text-[11px] uppercase tracking-wider"
              >
                {state.isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                Quick Save
              </Button>
            </motion.div>
          )}

          {isLastTab ? (
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={handleSave}
                disabled={!canSave || state.isSaving}
                className="h-10 gap-2 border-white/10 bg-white/5 hover:bg-white/10 text-slate-300 font-bold text-[11px] uppercase tracking-widest"
              >
                {state.isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Draft
              </Button>
              <motion.div whileHover={{ scale: 1.02, y: -1 }} whileTap={{ scale: 0.98 }}>
                <Button
                  onClick={openCompleteDialog}
                  disabled={!canComplete}
                  className="h-10 bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-8 shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all border-none uppercase tracking-widest text-[11px]"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Conclude Session
                </Button>
              </motion.div>
            </div>
          ) : (
            <motion.div whileHover={{ x: 2 }} whileTap={{ scale: 0.98 }}>
              <Button
                onClick={handleNext}
                className="h-10 bg-blue-600 hover:bg-blue-500 text-white font-bold gap-3 px-8 shadow-[0_0_20px_rgba(37,99,235,0.3)] border-none uppercase tracking-widest text-[11px] flex items-center"
              >
                Next Section
                <ChevronRight className="h-4 w-4" />
              </Button>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}

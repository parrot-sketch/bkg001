'use client';

/**
 * Consultation Workspace - Clean & Simple
 * 
 * Simplified clinical documentation workspace with:
 * - Clean horizontal tabs
 * - Simple rich text editor areas
 * - No decorative elements
 */

import { use, Suspense, useState, useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import {
    ChevronLeft,
    ChevronRight,
    Save,
    CheckCircle,
    Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useConsultationContext, type StructuredNotes } from '@/contexts/ConsultationContext';
import { toast } from 'sonner';

// ============================================================================
// LAZY LOADED TAB COMPONENTS
// ============================================================================

const PatientGoalsTab = dynamic(
    () => import('./tabs/PatientGoalsTab').then(mod => ({ default: mod.PatientGoalsTab })),
    { ssr: false }
);

const ExaminationTab = dynamic(
    () => import('./tabs/ExaminationTab').then(mod => ({ default: mod.ExaminationTab })),
    { ssr: false }
);

const RecommendationsTab = dynamic(
    () => import('./tabs/RecommendationsTab').then(mod => ({ default: mod.RecommendationsTab })),
    { ssr: false }
);

const TreatmentPlanTab = dynamic(
    () => import('./tabs/TreatmentPlanTab').then(mod => ({ default: mod.TreatmentPlanTab })),
    { ssr: false }
);

const BillingTab = dynamic(
    () => import('./tabs/BillingTab').then(mod => ({ default: mod.BillingTab })),
    { ssr: false }
);

// ============================================================================
// TAB CONFIGURATION
// ============================================================================

interface TabConfig {
    id: string;
    label: string;
    noteField: keyof StructuredNotes | null;
}

const TABS: TabConfig[] = [
    { id: 'goals', label: 'Goals', noteField: 'chiefComplaint' },
    { id: 'exam', label: 'Examination', noteField: 'examination' },
    { id: 'assessment', label: 'Assessment', noteField: 'assessment' },
    { id: 'plan', label: 'Plan', noteField: 'plan' },
    { id: 'billing', label: 'Billing', noteField: null },
];

// ============================================================================
// SKELETON
// ============================================================================

function TabSkeleton() {
    return (
        <div className="space-y-4 p-6">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-64 w-full" />
        </div>
    );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function ConsultationWorkspaceOptimized() {
    const router = useRouter();
    const searchParams = useSearchParams();

    const {
        state,
        isReadOnly,
        canSave,
        canComplete,
        saveDraft,
        updateNotes,
        setOutcome,
        setPatientDecision,
        openCompleteDialog,
    } = useConsultationContext();

    const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'goals');

    const currentTabIndex = useMemo(
        () => TABS.findIndex(t => t.id === activeTab),
        [activeTab],
    );

    // Track completed fields
    const completedFields = useMemo(() => {
        const fields = new Set<string>();
        const notes = state.notes;
        if (notes.chiefComplaint && notes.chiefComplaint.replace(/<[^>]*>/g, '').trim().length > 0) fields.add('chiefComplaint');
        if (notes.examination && notes.examination.replace(/<[^>]*>/g, '').trim().length > 0) fields.add('examination');
        if (notes.assessment && notes.assessment.replace(/<[^>]*>/g, '').trim().length > 0) fields.add('assessment');
        if (notes.plan && notes.plan.replace(/<[^>]*>/g, '').trim().length > 0) fields.add('plan');
        return fields;
    }, [state.notes]);

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

    const handleSave = useCallback(async () => {
        if (!canSave) return;
        await saveDraft();
        toast.success('Draft saved');
    }, [canSave, saveDraft]);

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
            {/* Tab Navigation - Simple horizontal tabs */}
            <div className="border-b bg-white px-4 shrink-0">
                <div className="flex gap-1">
                    {TABS.map((tab, index) => {
                        const isActive = index === currentTabIndex;
                        const isComplete = tab.noteField ? completedFields.has(tab.noteField) : false;

                        return (
                            <button
                                key={tab.id}
                                onClick={() => handleTabChange(tab.id)}
                                className={cn(
                                    "relative px-4 py-3 text-sm font-medium transition-colors",
                                    isActive
                                        ? "text-slate-900"
                                        : "text-slate-500 hover:text-slate-700"
                                )}
                            >
                                <span>{tab.label}</span>
                                {isComplete && !isActive && (
                                    <span className="ml-1 text-emerald-500">✓</span>
                                )}
                                {isActive && (
                                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-slate-900" />
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-y-auto">
                <Tabs value={activeTab} className="h-full">
                    <TabsContent value="goals" className="m-0 h-full border-none">
                        <div className="p-6 max-w-3xl mx-auto">
                            <PatientGoalsTab
                                initialValue={state.notes.chiefComplaint || ''}
                                onChange={handleNoteChange('chiefComplaint')}
                                isReadOnly={isReadOnly}
                            />
                        </div>
                    </TabsContent>

                    <TabsContent value="exam" className="m-0 h-full border-none">
                        <div className="p-6 max-w-3xl mx-auto">
                            <ExaminationTab
                                initialValue={state.notes.examination || ''}
                                onChange={handleNoteChange('examination')}
                                isReadOnly={isReadOnly}
                            />
                        </div>
                    </TabsContent>

                    <TabsContent value="assessment" className="m-0 h-full border-none">
                        <div className="p-6 max-w-3xl mx-auto">
                            <RecommendationsTab
                                consultation={state.consultation}
                                currentOutcome={state.outcomeType}
                                currentPatientDecision={state.patientDecision}
                                onOutcomeChange={setOutcome}
                                onPatientDecisionChange={setPatientDecision}
                                onAssessmentChange={handleNoteChange('assessment')}
                                isReadOnly={isReadOnly}
                            />
                        </div>
                    </TabsContent>

                    <TabsContent value="plan" className="m-0 h-full border-none">
                        <div className="p-6 max-w-3xl mx-auto">
                            <TreatmentPlanTab
                                consultation={state.consultation}
                                hasCasePlan={state.consultation?.hasCasePlan || false}
                                onPlanChange={handleNoteChange('plan')}
                                isReadOnly={isReadOnly}
                            />
                        </div>
                    </TabsContent>

                    <TabsContent value="billing" className="m-0 h-full border-none">
                        <div className="p-6 max-w-3xl mx-auto">
                            <BillingTab
                                appointmentId={state.appointment?.id}
                                isReadOnly={false}
                            />
                        </div>
                    </TabsContent>
                </Tabs>
            </div>

            {/* Footer Navigation */}
            <div className="border-t bg-slate-50 px-6 py-3 flex items-center justify-between">
                <Button
                    variant="ghost"
                    onClick={handlePrevious}
                    disabled={isFirstTab}
                    className="gap-2"
                >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                </Button>

                <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-500">
                        {currentTabIndex + 1} of {TABS.length}
                    </span>
                </div>

                {isLastTab ? (
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            onClick={handleSave}
                            disabled={!canSave || state.isSaving}
                            className="gap-2"
                        >
                            {state.isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                            Save Draft
                        </Button>
                        <Button
                            onClick={openCompleteDialog}
                            disabled={!canComplete}
                            className="gap-2"
                        >
                            <CheckCircle className="h-4 w-4" />
                            Complete
                        </Button>
                    </div>
                ) : (
                    <Button
                        onClick={handleNext}
                        className="gap-2"
                    >
                        Next
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                )}
            </div>
        </div>
    );
}

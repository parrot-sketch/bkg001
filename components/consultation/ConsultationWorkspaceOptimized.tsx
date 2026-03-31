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
    { id: 'concerns', label: 'Concerns', noteField: 'chiefComplaint' },
    { id: 'examination', label: 'Exam', noteField: 'examination' },
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

    const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'concerns');

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
            {/* Tab Navigation */}
            <div className="border-b border-slate-200 bg-white px-3 shrink-0">
                <div className="flex gap-0">
                    {TABS.map((tab, index) => {
                        const isActive = index === currentTabIndex;
                        const isComplete = tab.noteField ? completedFields.has(tab.noteField) : false;

                        return (
                            <button
                                key={tab.id}
                                onClick={() => handleTabChange(tab.id)}
                                className={cn(
                                    "relative px-3 py-2.5 text-xs font-medium transition-colors",
                                    isActive
                                        ? "text-slate-900"
                                        : "text-slate-400 hover:text-slate-600"
                                )}
                            >
                                {tab.label}
                                {isComplete && !isActive && (
                                    <span className="ml-1 text-emerald-500 text-[10px]">●</span>
                                )}
                                {isActive && (
                                    <div className="absolute bottom-0 left-1 right-1 h-0.5 bg-slate-900 rounded-full" />
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-y-auto">
                <Tabs value={activeTab} className="h-full">
                    <TabsContent value="concerns" className="m-0 h-full border-none">
                        <div className="p-4 max-w-3xl mx-auto">
                            <PatientGoalsTab
                                initialValue={state.notes.chiefComplaint || ''}
                                onChange={handleNoteChange('chiefComplaint')}
                                isReadOnly={isReadOnly}
                            />
                        </div>
                    </TabsContent>

                    <TabsContent value="examination" className="m-0 h-full border-none">
                        <div className="p-4 max-w-3xl mx-auto">
                            <ExaminationTab
                                initialValue={state.notes.examination || ''}
                                onChange={handleNoteChange('examination')}
                                isReadOnly={isReadOnly}
                            />
                        </div>
                    </TabsContent>

                    <TabsContent value="plan" className="m-0 h-full border-none">
                        <div className="p-4 max-w-3xl mx-auto">
                            <TreatmentPlanTab
                                consultation={state.consultation}
                                hasCasePlan={state.consultation?.hasCasePlan || false}
                                planValue={state.notes.plan || ''}
                                onPlanChange={handleNoteChange('plan')}
                                isReadOnly={isReadOnly}
                            />
                        </div>
                    </TabsContent>

                    <TabsContent value="billing" className="m-0 h-full border-none">
                        <div className="p-4 max-w-3xl mx-auto">
                            <BillingTab
                                appointmentId={state.appointment?.id}
                                isReadOnly={false}
                            />
                        </div>
                    </TabsContent>
                </Tabs>
            </div>

            {/* Footer Navigation */}
            <div className="border-t border-slate-200 bg-white px-4 py-2 flex items-center justify-between">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={handlePrevious}
                    disabled={isFirstTab}
                    className="gap-1 text-xs text-slate-500"
                >
                    <ChevronLeft className="h-3.5 w-3.5" />
                    Prev
                </Button>

                <span className="text-[11px] text-slate-400 font-medium">
                    {currentTabIndex + 1} / {TABS.length}
                </span>

                {isLastTab ? (
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleSave}
                            disabled={!canSave || state.isSaving}
                            className="gap-1 text-xs"
                        >
                            {state.isSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                            Save
                        </Button>
                        <Button
                            size="sm"
                            onClick={openCompleteDialog}
                            disabled={!canComplete}
                            className="gap-1 text-xs bg-emerald-600 hover:bg-emerald-700"
                        >
                            <CheckCircle className="h-3 w-3" />
                            Complete
                        </Button>
                    </div>
                ) : (
                    <Button
                        size="sm"
                        onClick={handleNext}
                        className="gap-1 text-xs"
                    >
                        Next
                        <ChevronRight className="h-3.5 w-3.5" />
                    </Button>
                )}
            </div>
        </div>
    );
}

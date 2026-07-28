'use client';

/**
 * Consultation Workspace — SOAP Documentation
 * 
 * Structured clinical documentation using the SOAP format:
 * - Subjective: patient concerns, history, symptoms (chief complaint)
 * - Objective: clinical findings, examination, vitals
 * - Assessment: clinical reasoning, diagnosis
 * - Plan: treatment, medications, follow-up
 * 
 * Notes remain editable even after consultation completion.
 */

import { Suspense, useState, useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Save,
    CheckCircle,
    Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useConsultationContext } from '@/contexts/ConsultationContext';
import { useDocumentationContext } from '@/providers/documentation/DocumentationProvider';
import type { StructuredNotes } from '@/shared-kernel/types/notes';
import { toast } from 'sonner';

// ============================================================================
// LAZY LOADED TAB COMPONENTS
// ============================================================================

const SubjectiveTab = dynamic(
    () => import('./tabs/SubjectiveTab').then(mod => ({ default: mod.SubjectiveTab })),
    { ssr: false }
);

const ObjectiveTab = dynamic(
    () => import('./tabs/ObjectiveTab').then(mod => ({ default: mod.ObjectiveTab })),
    { ssr: false }
);

const AssessmentTab = dynamic(
    () => import('./tabs/AssessmentTab').then(mod => ({ default: mod.AssessmentTab })),
    { ssr: false }
);

const PlanTab = dynamic(
    () => import('./tabs/PlanTab').then(mod => ({ default: mod.PlanTab })),
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
    { id: 'subjective', label: 'Subjective', noteField: 'chiefComplaint' },
    { id: 'objective', label: 'Objective', noteField: 'examination' },
    { id: 'assessment', label: 'Assessment', noteField: 'assessment' },
    { id: 'plan', label: 'Plan', noteField: 'plan' },
];

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
        openCompleteDialog,
    } = useConsultationContext();

    const docs = useDocumentationContext();

    const {
        notes,
        isSaving,
        autoSaveStatus,
        canSave,
        saveNotes,
        updateNotes,
    } = docs;

    const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'subjective');

    const currentTabIndex = useMemo(
        () => TABS.findIndex(t => t.id === activeTab),
        [activeTab],
    );

    // Track completed fields for advisory dots
    const completedFields = useMemo(() => {
        const fields = new Set<string>();
        if (notes.chiefComplaint && notes.chiefComplaint.replace(/<[^>]*>/g, '').trim().length > 0) fields.add('chiefComplaint');
        if (notes.examination && notes.examination.replace(/<[^>]*>/g, '').trim().length > 0) fields.add('examination');
        if (notes.assessment && notes.assessment.replace(/<[^>]*>/g, '').trim().length > 0) fields.add('assessment');
        if (notes.plan && notes.plan.replace(/<[^>]*>/g, '').trim().length > 0) fields.add('plan');
        return fields;
    }, [notes]);

    const handleTabChange = useCallback((tabId: string) => {
        setActiveTab(tabId);
        router.replace(`?tab=${tabId}`, { scroll: false });
    }, [router]);

    const handleSave = useCallback(async () => {
        if (!canSave) return;
        await saveNotes();
    }, [canSave, saveNotes]);

    const handleNoteChange = useCallback(
        (field: keyof StructuredNotes) => (value: string) => {
            updateNotes(field, value);
        },
        [updateNotes],
    );

    return (
        <div className="flex flex-col h-full bg-white">
            {/* Tab Navigation */}
            <div className="border-b border-[#e7d6bf] bg-white px-3 shrink-0">
                <div className="flex gap-0">
                    {TABS.map((tab, index) => {
                        const isActive = index === currentTabIndex;
                        const isComplete = tab.noteField ? completedFields.has(tab.noteField) : false;

                        return (
                            <button
                                key={tab.id}
                                onClick={() => handleTabChange(tab.id)}
                                className={cn(
                                    "relative px-4 py-3 text-xs font-medium transition-colors",
                                    isActive
                                        ? "text-[#2c2e4b]"
                                        : "text-slate-400 hover:text-[#2c2e4b]/70"
                                )}
                            >
                                {tab.label}
                                {isComplete && !isActive && (
                                    <span className="ml-1 text-[#caa26a] text-[10px]">●</span>
                                )}
                                {isActive && (
                                    <div className="absolute bottom-0 left-2 right-2 h-0.5 bg-[#caa26a] rounded-full" />
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar-light">
                <Tabs value={activeTab} className="h-full">
                    <TabsContent value="subjective" className="m-0 h-full border-none">
                        <div className="p-6 max-w-3xl mx-auto">
                            <SubjectiveTab
                                initialValue={notes.chiefComplaint || ''}
                                onChange={handleNoteChange('chiefComplaint')}
                                isReadOnly={isReadOnly}
                            />
                        </div>
                    </TabsContent>

                    <TabsContent value="objective" className="m-0 h-full border-none">
                        <div className="p-6 max-w-3xl mx-auto">
                            <ObjectiveTab
                                initialValue={notes.examination || ''}
                                onChange={handleNoteChange('examination')}
                                isReadOnly={isReadOnly}
                            />
                        </div>
                    </TabsContent>

                    <TabsContent value="assessment" className="m-0 h-full border-none">
                        <div className="p-6 max-w-3xl mx-auto">
                            <AssessmentTab
                                initialValue={notes.assessment || ''}
                                onChange={handleNoteChange('assessment')}
                                isReadOnly={isReadOnly}
                            />
                        </div>
                    </TabsContent>

                    <TabsContent value="plan" className="m-0 h-full border-none">
                        <div className="p-6 max-w-3xl mx-auto">
                            <PlanTab
                                initialValue={notes.plan || ''}
                                onChange={handleNoteChange('plan')}
                                consultation={state.consultation}
                                isReadOnly={isReadOnly}
                            />
                        </div>
                    </TabsContent>
                </Tabs>
            </div>

            {/* Persistent Action Bar — always visible on every tab */}
            <div className="border-t border-[#e7d6bf] bg-[#e7d6bf]/20 px-6 py-3 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-1.5">
                    {completedFields.size > 0 && (
                        <span className="text-[11px] text-[#2c2e4b]/60">
                            {completedFields.size}/{TABS.filter(t => t.noteField).length} sections documented
                        </span>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleSave}
                        disabled={!canSave || isSaving}
                        className="gap-1.5 text-xs h-8 border-[#e7d6bf] text-[#2c2e4b] hover:bg-[#e7d6bf]/30 rounded-lg"
                    >
                        {isSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                        Save Notes
                    </Button>
                    {isActive && (
                        <Button
                            size="sm"
                            onClick={openCompleteDialog}
                            className="gap-1.5 text-xs h-8 bg-[#caa26a] hover:bg-[#caa26a]/90 text-[#2c2e4b] font-semibold rounded-lg shadow-sm transition-colors"
                        >
                            <CheckCircle className="h-3 w-3" />
                            Complete
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
}

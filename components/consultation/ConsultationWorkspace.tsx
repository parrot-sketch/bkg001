'use client';

/**
 * Consultation Workspace
 * 
 * Main workspace area with tab-based navigation for consultation sections.
 * Designed for surgeon efficiency: fast tab switching, keyboard-friendly.
 * 
 * Clinical workstation design: no fancy animations, no clutter, pure functionality.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { PatientGoalsTab } from './tabs/PatientGoalsTab';
import { ExaminationTab } from './tabs/ExaminationTab';
import { ProcedureDiscussionTab } from './tabs/ProcedureDiscussionTab';
import { PhotosTab } from './tabs/PhotosTab';
import { RecommendationsTab } from './tabs/RecommendationsTab';
import { TreatmentPlanTab } from './tabs/TreatmentPlanTab';
import { QuickTextPanel } from './QuickTextPanel';
import { TemplateSelector } from './TemplateSelector';
import type { ConsultationResponseDto } from '@/application/dtos/ConsultationResponseDto';
import { ConsultationOutcomeType } from '@/domain/enums/ConsultationOutcomeType';
import { PatientDecision } from '@/domain/enums/PatientDecision';
import { generateTemplateHTML, type ClinicalTemplate } from '@/lib/clinical-templates';
import { toast } from 'sonner';

interface StructuredNotes {
  chiefComplaint?: string;
  examination?: string;
  assessment?: string;
  plan?: string;
}

interface ConsultationWorkspaceProps {
  consultation: ConsultationResponseDto | null;
  onNotesChange: (notes: { rawText?: string; structured?: StructuredNotes }) => void;
  onOutcomeChange?: (outcomeType: ConsultationOutcomeType) => void;
  onPatientDecisionChange?: (decision: PatientDecision) => void;
  onSave?: () => void;
  onComplete?: () => void;
  isReadOnly?: boolean;
  isSaving?: boolean;
}

export function ConsultationWorkspace({
  consultation,
  onNotesChange,
  onOutcomeChange,
  onPatientDecisionChange,
  onSave,
  onComplete,
  isReadOnly = false,
  isSaving = false,
}: ConsultationWorkspaceProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'goals');
  const [showQuickText, setShowQuickText] = useState(true);

  // Extract structured notes if available
  const structuredNotes = consultation?.notes?.structured || {};

  // Manage structured notes state
  const [notesState, setNotesState] = useState<StructuredNotes>({
    chiefComplaint: structuredNotes.chiefComplaint || '',
    examination: structuredNotes.examination || '',
    assessment: structuredNotes.assessment || '',
    plan: structuredNotes.plan || '',
  });

  // Sync state with prop when loaded (for reload/initial fetch)
  useEffect(() => {
    if (consultation?.notes?.structured) {
      setNotesState(prev => {
        // Use non-null assertion because filtered by if condition
        const serverNotes = consultation.notes!.structured!;

        // Only update if we have meaningful data from server
        // This ensures that on page reload, the data is populated
        return {
          chiefComplaint: serverNotes.chiefComplaint || prev.chiefComplaint,
          examination: serverNotes.examination || prev.examination,
          assessment: serverNotes.assessment || prev.assessment,
          plan: serverNotes.plan || prev.plan,
        };
      });
    }
  }, [consultation]);

  // Track active field for quick text insertion
  // We'll update the active field based on the active tab
  const getActiveField = (tab: string): keyof StructuredNotes | null => {
    switch (tab) {
      case 'goals': return 'chiefComplaint';
      case 'examination': return 'examination';
      case 'recommendations': return 'assessment'; // Defaults to assessment, could be plan
      case 'procedure': return 'plan';
      case 'treatment': return 'plan';
      default: return null;
    }
  };

  // Update structured notes and notify parent
  const updateStructuredNotes = useCallback((field: keyof StructuredNotes, value: string) => {
    setNotesState((prev) => {
      const updated = { ...prev, [field]: value };

      // Generate full text from structured notes
      const fullText = [
        updated.chiefComplaint && `Chief Complaint: ${updated.chiefComplaint}`,
        updated.examination && `Examination: ${updated.examination}`,
        updated.assessment && `Assessment: ${updated.assessment}`,
        updated.plan && `Plan: ${updated.plan}`,
      ]
        .filter(Boolean)
        .join('\n\n');

      // Defer parent notification to next tick to avoid setState during render
      setTimeout(() => {
        onNotesChange({
          rawText: fullText,
          structured: updated,
        });
      }, 0);

      return updated;
    });
  }, [onNotesChange]);

  // Handle template selection
  const handleTemplateSelect = (template: ClinicalTemplate) => {
    // Determine which field to populate based on template sections
    // This is a simplified mapping logic
    let updates: Partial<StructuredNotes> = {};

    // Map template sections to note fields
    template.sections.forEach(section => {
      const content = section.content || '';

      if (section.id.includes('complaint') || section.id.includes('goals')) {
        updates.chiefComplaint = (updates.chiefComplaint || '') + content;
      } else if (section.id.includes('exam') || section.id.includes('physical')) {
        updates.examination = (updates.examination || '') + content;
      } else if (section.id.includes('assessment') || section.id.includes('diagnosis')) {
        updates.assessment = (updates.assessment || '') + content;
      } else if (section.id.includes('plan') || section.id.includes('recommendation') || section.id.includes('treatment')) {
        updates.plan = (updates.plan || '') + content;
      }
    });

    setNotesState(prev => {
      const newState = { ...prev };

      // Merge template content with existing content
      if (updates.chiefComplaint) newState.chiefComplaint = (newState.chiefComplaint || '') + updates.chiefComplaint;
      if (updates.examination) newState.examination = (newState.examination || '') + updates.examination;
      if (updates.assessment) newState.assessment = (newState.assessment || '') + updates.assessment;
      if (updates.plan) newState.plan = (newState.plan || '') + updates.plan;

      // Notify parent
      const fullText = [
        newState.chiefComplaint,
        newState.examination,
        newState.assessment,
        newState.plan
      ].filter(Boolean).join('\n\n');

      onNotesChange({
        rawText: fullText,
        structured: newState
      });

      return newState;
    });

    toast.success(`Applied template: ${template.name}`);
  };

  // Handle quick text insertion
  const handleQuickTextInsert = (text: string) => {
    const activeField = getActiveField(activeTab);

    if (activeField) {
      const currentContent = notesState[activeField] || '';
      // Append content. Ideally we'd insert at cursor position but without ref access to editor
      // appending is the safest fallback for this level of integration
      const newContent = currentContent + `<p>${text}</p>`;

      // Defer to next tick to avoid setState during render
      setTimeout(() => {
        updateStructuredNotes(activeField, newContent);
        toast.success('Inserted quick text');
      }, 0);
    } else {
      toast.error('Select a text field to insert quick text');
    }
  };

  // Handle tab change with URL persistence
  const handleTabChange = useCallback((tab: string) => {
    setActiveTab(tab);
    router.replace(`?tab=${tab}`, { scroll: false });
  }, [router]);

  return (
    <div className="flex-1 flex min-w-0 h-full">
      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex items-center justify-between px-4 py-2 bg-muted/30 border-b">
          <div className="flex items-center gap-1">
            <button
              onClick={() => handleTabChange('goals')}
              className={getTabClass(activeTab === 'goals')}
            >
              Chief Complaint
            </button>
            <button
              onClick={() => handleTabChange('examination')}
              className={getTabClass(activeTab === 'examination')}
            >
              Examination
            </button>
            <button
              onClick={() => handleTabChange('procedure')}
              className={getTabClass(activeTab === 'procedure')}
            >
              Procedure
            </button>
            <button
              onClick={() => handleTabChange('photos')}
              className={getTabClass(activeTab === 'photos')}
            >
              Photos
            </button>
            <button
              onClick={() => handleTabChange('recommendations')}
              className={getTabClass(activeTab === 'recommendations')}
            >
              Assessment
            </button>
            <button
              onClick={() => handleTabChange('treatment')}
              className={getTabClass(activeTab === 'treatment')}
            >
              Plan
            </button>
          </div>

          <div className="flex items-center gap-2">
            {/* <TemplateSelector onSelect={handleTemplateSelect} className="h-8" /> */}
            <Button
              variant="ghost"
              size="sm"
              className={`h-8 text-xs ${showQuickText ? 'bg-muted' : ''}`}
              onClick={() => setShowQuickText(!showQuickText)}
            >
              Quick Text
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 bg-white/50">
          <Tabs value={activeTab} className="h-full">
            <TabsContent value="goals" className="mt-0 h-full">
              <PatientGoalsTab
                initialValue={notesState.chiefComplaint}
                onChange={(value) => updateStructuredNotes('chiefComplaint', value)}
                onSave={onSave}
                isSaving={isSaving}
                isReadOnly={isReadOnly}
              />
            </TabsContent>

            <TabsContent value="examination" className="mt-0 h-full">
              <ExaminationTab
                initialValue={notesState.examination}
                onChange={(value) => updateStructuredNotes('examination', value)}
                onSave={onSave}
                isSaving={isSaving}
                isReadOnly={isReadOnly}
              />
            </TabsContent>

            <TabsContent value="procedure" className="mt-0 h-full">
              <ProcedureDiscussionTab
                consultation={consultation}
                discussionContent={notesState.plan}
                onDiscussionChange={(value) => updateStructuredNotes('plan', value)}
                onPatientDecisionChange={onPatientDecisionChange}
                onSave={onSave}
                isSaving={isSaving}
                isReadOnly={isReadOnly}
              />
            </TabsContent>

            <TabsContent value="photos" className="mt-0 h-full">
              <PhotosTab
                appointmentId={consultation?.appointmentId}
                photoCount={consultation?.photoCount || 0}
                isReadOnly={isReadOnly}
              />
            </TabsContent>

            <TabsContent value="recommendations" className="mt-0 h-full">
              <RecommendationsTab
                consultation={consultation}
                onOutcomeChange={onOutcomeChange}
                onAssessmentChange={(value) => updateStructuredNotes('assessment', value)}
                onPlanChange={(value) => updateStructuredNotes('plan', value)}
                onSave={onSave}
                isSaving={isSaving}
                isReadOnly={isReadOnly}
              />
            </TabsContent>

            <TabsContent value="treatment" className="mt-0 h-full">
              <TreatmentPlanTab
                consultation={consultation}
                hasCasePlan={consultation?.hasCasePlan || false}
                onPlanChange={(value) => updateStructuredNotes('plan', value)}
                onSave={onSave}
                isSaving={isSaving}
                isReadOnly={isReadOnly}
              />
            </TabsContent>
          </Tabs>
        </div>

        {/* Navigation Footer */}
        <div className="border-t bg-white p-4 flex justify-between items-center">
          <Button
            variant="outline"
            onClick={() => {
              const tabs = ['goals', 'examination', 'procedure', 'photos', 'recommendations', 'treatment'];
              const currentIndex = tabs.indexOf(activeTab);
              if (currentIndex > 0) handleTabChange(tabs[currentIndex - 1]);
            }}
            disabled={activeTab === 'goals'}
          >
            Previous
          </Button>

          <div className="flex gap-2">
            {activeTab === 'treatment' ? (
              <div className="flex gap-2">
                <Button variant="outline" onClick={onSave} disabled={isSaving}>
                  {isSaving ? 'Saving...' : 'Save Draft'}
                </Button>
                <Button
                  onClick={onComplete}
                  disabled={isSaving || isReadOnly}
                  className="bg-green-600 hover:bg-green-700 text-white shadow-sm"
                >
                  Complete Consultation
                </Button>
              </div>
            ) : (
              <Button
                onClick={() => {
                  const tabs = ['goals', 'examination', 'procedure', 'photos', 'recommendations', 'treatment'];
                  const currentIndex = tabs.indexOf(activeTab);
                  if (currentIndex < tabs.length - 1) handleTabChange(tabs[currentIndex + 1]);
                }}
              >
                Next
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Quick Text Panel Sidebar */}
      {/* Quick Text Panel Sidebar (Right Column) */}
      {showQuickText && !isReadOnly && (
        <div className="w-80 border-l bg-white h-full flex flex-col shrink-0">
          <div className="p-4 border-b bg-muted/30">
            <h3 className="font-semibold text-sm">Quick Text</h3>
          </div>
          <div className="flex-1 overflow-y-auto">
            <QuickTextPanel onInsert={handleQuickTextInsert} className="border-0 shadow-none p-0" />
          </div>
        </div>
      )}
    </div>
  );
}

// Helper for tab styling
function getTabClass(isActive: boolean) {
  return `text-xs px-3 py-1.5 rounded-full transition-all ${isActive
    ? 'bg-primary text-primary-foreground font-semibold shadow-sm'
    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
    }`;
}

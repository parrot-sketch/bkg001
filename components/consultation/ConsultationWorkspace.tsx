'use client';

/**
 * Consultation Workspace
 * 
 * Main workspace area with tab-based navigation for consultation sections.
 * Designed for surgeon efficiency: fast tab switching, keyboard-friendly.
 * 
 * Clinical workstation design: no fancy animations, no clutter, pure functionality.
 */

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PatientGoalsTab } from './tabs/PatientGoalsTab';
import { ExaminationTab } from './tabs/ExaminationTab';
import { ProcedureDiscussionTab } from './tabs/ProcedureDiscussionTab';
import { PhotosTab } from './tabs/PhotosTab';
import { RecommendationsTab } from './tabs/RecommendationsTab';
import { TreatmentPlanTab } from './tabs/TreatmentPlanTab';
import type { ConsultationResponseDto } from '@/application/dtos/ConsultationResponseDto';

interface ConsultationWorkspaceProps {
  consultation: ConsultationResponseDto | null;
  onNotesChange: (notes: string) => void;
  isReadOnly?: boolean;
}

export function ConsultationWorkspace({
  consultation,
  onNotesChange,
  isReadOnly = false,
}: ConsultationWorkspaceProps) {
  const [activeTab, setActiveTab] = useState('goals');

  // Extract structured notes if available
  const structuredNotes = consultation?.notes?.structured;

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList className="grid w-full grid-cols-6 h-10 bg-muted/50">
          <TabsTrigger value="goals" className="text-xs">Chief Complaint</TabsTrigger>
          <TabsTrigger value="examination" className="text-xs">Examination</TabsTrigger>
          <TabsTrigger value="procedure" className="text-xs">Procedure Discussion</TabsTrigger>
          <TabsTrigger value="photos" className="text-xs">Clinical Photos</TabsTrigger>
          <TabsTrigger value="recommendations" className="text-xs font-semibold">Assessment & Plan</TabsTrigger>
          <TabsTrigger value="treatment" className="text-xs">Treatment Plan</TabsTrigger>
        </TabsList>

        <div className="flex-1 overflow-y-auto p-6">
          <TabsContent value="goals" className="mt-0">
            <PatientGoalsTab
              initialValue={structuredNotes?.chiefComplaint}
              onChange={(value) => onNotesChange(value)}
              isReadOnly={isReadOnly}
            />
          </TabsContent>

          <TabsContent value="examination" className="mt-0">
            <ExaminationTab
              initialValue={structuredNotes?.examination}
              onChange={(value) => onNotesChange(value)}
              isReadOnly={isReadOnly}
            />
          </TabsContent>

          <TabsContent value="procedure" className="mt-0">
            <ProcedureDiscussionTab
              consultation={consultation}
              isReadOnly={isReadOnly}
            />
          </TabsContent>

          <TabsContent value="photos" className="mt-0">
            <PhotosTab
              appointmentId={consultation?.appointmentId}
              photoCount={consultation?.photoCount || 0}
              isReadOnly={isReadOnly}
            />
          </TabsContent>

          <TabsContent value="recommendations" className="mt-0">
            <RecommendationsTab
              consultation={consultation}
              isReadOnly={isReadOnly}
            />
          </TabsContent>

          <TabsContent value="treatment" className="mt-0">
            <TreatmentPlanTab
              consultation={consultation}
              hasCasePlan={consultation?.hasCasePlan || false}
              isReadOnly={isReadOnly}
            />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}

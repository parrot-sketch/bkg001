/**
 * Procedure Tab View
 * 
 * Presentational component for procedure tab.
 * No API calls, no parsing, no business logic.
 */

'use client';

import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RichTextEditor } from '@/components/consultation/RichTextEditor';
import { LoadingState } from '../../shared/components/LoadingState';
import { ErrorState } from '../../shared/components/ErrorState';
import { SaveBar } from '../../shared/components/SaveBar';
import { Stethoscope } from 'lucide-react';
import { ProcedureSelect } from '@/components/ui/procedure-select';
import { InventoryPlanningTabContainer } from '../inventory-planning/InventoryPlanningTab.container';

interface ProcedureTabViewProps {
  caseId: string;
  // Data
  procedureName: string;
  procedurePlan: string;
  equipmentNotes: string;
  patientPositioning: string;
  surgeonNarrative: string;
  postOpInstructions: string;
  
  services: { id: string; name: string; category: string }[];
  servicesLoading: boolean;
  
  // Loading states
  isLoading: boolean;
  isSaving: boolean;
  
  // Errors
  error: Error | null;
  
  // Actions
  onProcedureNameChange: (value: string) => void;
  onProcedurePlanChange: (value: string) => void;
  onEquipmentNotesChange: (value: string) => void;
  onPatientPositioningChange: (value: string) => void;
  onSurgeonNarrativeChange: (value: string) => void;
  onPostOpInstructionsChange: (value: string) => void;
  
  onSave: () => void;
  onRetry: () => void;
  
  // Save state
  canSave: boolean;
  readOnly?: boolean;
}

export function ProcedureTabView({
  caseId,
  procedureName,
  procedurePlan,
  equipmentNotes,
  patientPositioning,
  surgeonNarrative,
  postOpInstructions,
  services,
  servicesLoading,
  isLoading,
  isSaving,
  error,
  onProcedureNameChange,
  onProcedurePlanChange,
  onEquipmentNotesChange,
  onPatientPositioningChange,
  onSurgeonNarrativeChange,
  onPostOpInstructionsChange,
  onSave,
  onRetry,
  canSave,
  readOnly = false,
}: ProcedureTabViewProps) {
  if (error) {
    return <ErrorState error={error} onRetry={onRetry} />;
  }

  if (isLoading) {
    return <LoadingState />;
  }

  return (
    <div className="space-y-8 pb-10">
      <div className="flex items-center gap-2">
        <Stethoscope className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold tracking-tight">Procedure Plan</h3>
      </div>

      <div className="space-y-6">
        {/* Core Procedure Identification */}
        <section className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Procedure Name</Label>
              <ProcedureSelect
                value={procedureName}
                onChange={onProcedureNameChange}
                services={services}
                loading={servicesLoading}
                placeholder="Search or select a procedure..."
                disabled={readOnly || isSaving}
              />
            </div>
            
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Patient Positioning</Label>
              <Select
                value={patientPositioning}
                onValueChange={onPatientPositioningChange}
                disabled={readOnly || isSaving}
              >
                <SelectTrigger className="h-11 border-input bg-background hover:border-primary/50 transition-colors">
                  <SelectValue placeholder="Select position..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Supine">Supine (Flat on back)</SelectItem>
                  <SelectItem value="Prone">Prone (Flat on stomach)</SelectItem>
                  <SelectItem value="Lateral Left">Lateral Left (On left side)</SelectItem>
                  <SelectItem value="Lateral Right">Lateral Right (On right side)</SelectItem>
                  <SelectItem value="Lithotomy">Lithotomy (Back, legs in stirrups)</SelectItem>
                  <SelectItem value="Fowler's">Fowler's (Sitting)</SelectItem>
                  <SelectItem value="Semi-Fowler's">Semi-Fowler's (Inclined)</SelectItem>
                  <SelectItem value="Trendelenburg">Trendelenburg (Head down)</SelectItem>
                  <SelectItem value="Reverse Trendelenburg">Reverse Trendelenburg (Head up)</SelectItem>
                  <SelectItem value="Jackknife">Jackknife (Kneeling-horizontal)</SelectItem>
                  <SelectItem value="Lateral Decubitus">Lateral Decubitus</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </section>

        {/* Surgical Plan */}
        <section className="space-y-1.5">
          <Label className="text-sm font-medium">Pre-Operative Plan</Label>
          <p className="text-xs text-muted-foreground mb-2">
            Describe the intended surgical approach, technique, and step-by-step plan.
          </p>
          <div className="bg-white rounded-md border shadow-sm">
            <RichTextEditor
              placeholder="Describe the surgical approach and technique…"
              content={procedurePlan}
              onChange={onProcedurePlanChange}
              minHeight="150px"
              readOnly={readOnly}
            />
          </div>
        </section>

        {/* Equipment & Requirements */}
        <section className="space-y-1.5">
          <Label className="text-sm font-medium">Equipment & Prep Notes for Theater</Label>
          <p className="text-xs text-muted-foreground mb-2">
            Specific instruments, retractors, sutures, or theater prep requirements.
          </p>
          <Textarea 
            placeholder="e.g. Needs Bookwalter retractor, specific implant sizes..."
            value={equipmentNotes}
            onChange={(e) => onEquipmentNotesChange(e.target.value)}
            disabled={readOnly || isSaving}
            className="min-h-[100px] text-sm resize-y"
          />
        </section>
        
        {/* Post-Op & Narrative */}
        <section className="grid grid-cols-1 gap-6 pt-4 border-t">
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Surgeon's Narrative (Operative Note)</Label>
            <p className="text-xs text-muted-foreground mb-2">
              Post-operative detailed narrative. Generally filled out after surgery.
            </p>
            <div className="bg-white rounded-md border shadow-sm">
              <RichTextEditor
                placeholder="Detailed operative findings and steps..."
                content={surgeonNarrative}
                onChange={onSurgeonNarrativeChange}
                minHeight="200px"
                readOnly={readOnly}
              />
            </div>
          </div>
          
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Post-Op Care Instructions</Label>
            <p className="text-xs text-muted-foreground mb-2">
              Specific recovery instructions, weight-bearing status, wound care, etc.
            </p>
            <div className="bg-white rounded-md border shadow-sm">
              <RichTextEditor
                placeholder="Provide post-operative instructions for ward and patient..."
                content={postOpInstructions}
                onChange={onPostOpInstructionsChange}
                minHeight="150px"
                readOnly={readOnly}
              />
            </div>
          </div>
        </section>

        {/* Inventory Planning (Supplies) */}
        <section className="pt-8 border-t">
          <InventoryPlanningTabContainer caseId={caseId} />
        </section>
      </div>

      {canSave && !readOnly && (
        <SaveBar onSave={onSave} saving={isSaving} label="Save Procedure Plan" />
      )}
    </div>
  );
}

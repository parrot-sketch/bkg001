/**
 * Risk Factors Tab View
 * 
 * Presentational component for risk factors tab.
 * No API calls, no parsing, no business logic.
 */

'use client';

import { Label } from '@/components/ui/label';
import { RichTextEditor } from '@/components/consultation/RichTextEditor';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { LoadingState } from '../../shared/components/LoadingState';
import { ErrorState } from '../../shared/components/ErrorState';
import { SaveBar } from '../../shared/components/SaveBar';
import { ShieldAlert, Plus } from 'lucide-react';

interface RiskFactorsTabViewProps {
  // Data
  riskFactors: string;
  preOpNotes: string;
  
  // Loading states
  isLoading: boolean;
  isSaving: boolean;
  
  // Errors
  error: Error | null;
  
  // Actions
  onRiskFactorsChange: (value: string) => void;
  onPreOpNotesChange: (value: string) => void;
  onSave: () => void;
  onRetry: () => void;
  onInsertTemplate: () => void;
  
  // Save state
  canSave: boolean;
  
  // Dialog state
  showTemplateDialog: boolean;
  onTemplateDialogChange: (show: boolean) => void;
  readOnly?: boolean;
}

export function RiskFactorsTabView({
  riskFactors,
  preOpNotes,
  isLoading,
  isSaving,
  error,
  onRiskFactorsChange,
  onPreOpNotesChange,
  onSave,
  onRetry,
  onInsertTemplate,
  canSave,
  showTemplateDialog,
  onTemplateDialogChange,
  readOnly = false,
}: RiskFactorsTabViewProps) {
  if (error) {
    return <ErrorState error={error} onRetry={onRetry} />;
  }

  if (isLoading) {
    return <LoadingState />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <ShieldAlert className="h-5 w-5 text-amber-500" />
        <h3 className="text-lg font-semibold">Risk & Pre-op Assessment</h3>
      </div>

      <div className="space-y-5">
        <div className="space-y-1.5">
          <Label className="text-sm font-medium">Risk Factors & Comorbidities</Label>
          <RichTextEditor
            placeholder="Allergies, previous scars, BMI considerations…"
            content={riskFactors}
            onChange={onRiskFactorsChange}
            minHeight="150px"
            readOnly={readOnly}
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Pre-operative Notes</Label>
            {!readOnly && (
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs gap-1.5"
                onClick={() => onTemplateDialogChange(true)}
              >
                <Plus className="h-3 w-3" />
                Insert Template
              </Button>
            )}
          </div>
          <RichTextEditor
            placeholder="Instructions for patient, specific clearance…"
            content={preOpNotes}
            onChange={onPreOpNotesChange}
            minHeight="250px"
            readOnly={readOnly}
          />
        </div>
      </div>

      {canSave && !readOnly && (
        <SaveBar onSave={onSave} saving={isSaving} label="Save Risk Factors" />
      )}

      {/* Template Insertion Dialog */}
      <Dialog open={showTemplateDialog} onOpenChange={onTemplateDialogChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Insert Pre-op Template</DialogTitle>
            <DialogDescription>
              This will {preOpNotes && preOpNotes.length > 10 ? 'append' : 'insert'} the template into your pre-op notes.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => onTemplateDialogChange(false)}>
              Cancel
            </Button>
            <Button onClick={onInsertTemplate}>
              Insert Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

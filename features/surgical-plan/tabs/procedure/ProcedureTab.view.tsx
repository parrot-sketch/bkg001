/**
 * Procedure Tab View
 * 
 * Presentational component for procedure tab.
 * No API calls, no parsing, no business logic.
 */

'use client';

import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { RichTextEditor } from '@/components/consultation/RichTextEditor';
import { LoadingState } from '../../shared/components/LoadingState';
import { ErrorState } from '../../shared/components/ErrorState';
import { SaveBar } from '../../shared/components/SaveBar';
import { Stethoscope } from 'lucide-react';

interface ProcedureTabViewProps {
  // Data
  procedureName: string;
  procedurePlan: string;
  
  // Loading states
  isLoading: boolean;
  isSaving: boolean;
  
  // Errors
  error: Error | null;
  
  // Actions
  onProcedureNameChange: (value: string) => void;
  onProcedurePlanChange: (value: string) => void;
  onSave: () => void;
  onRetry: () => void;
  
  // Save state
  canSave: boolean;
}

export function ProcedureTabView({
  procedureName,
  procedurePlan,
  isLoading,
  isSaving,
  error,
  onProcedureNameChange,
  onProcedurePlanChange,
  onSave,
  onRetry,
  canSave,
}: ProcedureTabViewProps) {
  if (error) {
    return <ErrorState error={error} onRetry={onRetry} />;
  }

  if (isLoading) {
    return <LoadingState />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Stethoscope className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold">Procedure Plan</h3>
      </div>

      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label className="text-sm font-medium">Procedure Name</Label>
          <Input
            value={procedureName}
            onChange={(e) => onProcedureNameChange(e.target.value)}
            placeholder="e.g. Total Knee Replacement"
            className="bg-background"
          />
          <p className="text-xs text-muted-foreground">
            Procedure name for print summary and documentation
          </p>
        </div>

        <div className="space-y-1.5">
          <Label className="text-sm font-medium">Procedure Plan</Label>
          <p className="text-sm text-muted-foreground">
            Describe the surgical approach, technique, and step-by-step plan.
          </p>
          <RichTextEditor
            placeholder="Describe the surgical approach and technique…"
            content={procedurePlan}
            onChange={onProcedurePlanChange}
            minHeight="300px"
          />
        </div>
      </div>

      {canSave && (
        <SaveBar onSave={onSave} saving={isSaving} label="Save Procedure Plan" />
      )}
    </div>
  );
}

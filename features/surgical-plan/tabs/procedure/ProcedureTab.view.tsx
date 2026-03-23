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
import { ProcedureSelect } from '@/components/ui/procedure-select';

interface ProcedureTabViewProps {
  // Data
  procedureName: string;
  procedurePlan: string;
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
  onSave: () => void;
  onRetry: () => void;
  
  // Save state
  canSave: boolean;
  readOnly?: boolean;
}

export function ProcedureTabView({
  procedureName,
  procedurePlan,
  services,
  servicesLoading,
  isLoading,
  isSaving,
  error,
  onProcedureNameChange,
  onProcedurePlanChange,
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
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Stethoscope className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold">Procedure Plan</h3>
      </div>

      <div className="space-y-4">
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
            readOnly={readOnly}
          />
        </div>
      </div>

      {canSave && !readOnly && (
        <SaveBar onSave={onSave} saving={isSaving} label="Save Procedure Plan" />
      )}
    </div>
  );
}

/**
 * Anesthesia Tab View
 * 
 * Presentational component for anesthesia tab.
 * No API calls, no parsing, no business logic.
 */

'use client';

import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RichTextEditor } from '@/components/consultation/RichTextEditor';
import { LoadingState } from '../../shared/components/LoadingState';
import { ErrorState } from '../../shared/components/ErrorState';
import { SaveBar } from '../../shared/components/SaveBar';
import { Syringe, Clock } from 'lucide-react';
import { ANESTHESIA_TYPES } from '../../core/constants';
import { AnesthesiaType } from '@prisma/client';

interface AnesthesiaTabViewProps {
  // Data
  anesthesiaPlan: AnesthesiaType | null;
  specialInstructions: string;
  estimatedDurationMinutes: string;
  
  // Loading states
  isLoading: boolean;
  isSaving: boolean;
  
  // Errors
  error: Error | null;
  
  // Actions
  onAnesthesiaPlanChange: (value: AnesthesiaType | null) => void;
  onSpecialInstructionsChange: (value: string) => void;
  onEstimatedDurationMinutesChange: (value: string) => void;
  onSave: () => void;
  onRetry: () => void;
  
  // Save state
  canSave: boolean;
}

export function AnesthesiaTabView({
  anesthesiaPlan,
  specialInstructions,
  estimatedDurationMinutes,
  isLoading,
  isSaving,
  error,
  onAnesthesiaPlanChange,
  onSpecialInstructionsChange,
  onEstimatedDurationMinutesChange,
  onSave,
  onRetry,
  canSave,
}: AnesthesiaTabViewProps) {
  if (error) {
    return <ErrorState error={error} onRetry={onRetry} />;
  }

  if (isLoading) {
    return <LoadingState />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Syringe className="h-5 w-5 text-blue-500" />
        <h3 className="text-lg font-semibold">Anesthesia & OR Prep</h3>
      </div>

      <div className="space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Anesthesia Type</Label>
            <Select
              value={anesthesiaPlan || ''}
              onValueChange={(value) =>
                onAnesthesiaPlanChange(value ? (value as AnesthesiaType) : null)
              }
            >
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="Select anesthesia type…" />
              </SelectTrigger>
              <SelectContent>
                {ANESTHESIA_TYPES.map((a) => (
                  <SelectItem key={a.value} value={a.value}>
                    {a.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm font-medium">
              <div className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                Estimated Duration (minutes)
              </div>
            </Label>
            <Input
              type="number"
              min={15}
              max={600}
              step={15}
              placeholder="e.g. 120"
              value={estimatedDurationMinutes}
              onChange={(e) => onEstimatedDurationMinutesChange(e.target.value)}
              className="bg-background"
            />
            <p className="text-xs text-muted-foreground">15–600 min. Used for theater scheduling.</p>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-sm font-medium">Special Instructions</Label>
          <RichTextEditor
            placeholder="Positioning, special medications, prep instructions…"
            content={specialInstructions}
            onChange={onSpecialInstructionsChange}
            minHeight="150px"
          />
        </div>
      </div>

      {canSave && (
        <SaveBar onSave={onSave} saving={isSaving} label="Save Anesthesia Plan" />
      )}
    </div>
  );
}

/**
 * Hook: useAnesthesiaTab
 * 
 * Data loading and actions for anesthesia tab.
 * No JSX returned - pure logic only.
 */

import { useState, useCallback, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { surgicalPlanApi } from '../../shared/api/surgicalPlanApi';
import { parseUpdateAnesthesiaRequest } from './anesthesiaParsers';
import { buildUpdateAnesthesiaPayload } from './anesthesiaMappers';
import { useSurgicalCasePlanPage } from '../../shared/hooks/useSurgicalCasePlanPage';
import { AnesthesiaType } from '@prisma/client';

interface AnesthesiaViewModel {
  anesthesiaPlan: AnesthesiaType | null;
  specialInstructions: string;
  estimatedDurationMinutes: number | null;
}

interface UseAnesthesiaTabResult {
  // Data
  viewModel: AnesthesiaViewModel | null;
  
  // Loading states
  isLoading: boolean;
  isSaving: boolean;
  
  // Errors
  error: Error | null;
  
  // Editing state
  localAnesthesiaPlan: AnesthesiaType | null;
  localSpecialInstructions: string;
  localEstimatedDurationMinutes: string;
  setAnesthesiaPlan: (value: AnesthesiaType | null) => void;
  setSpecialInstructions: (value: string) => void;
  setEstimatedDurationMinutes: (value: string) => void;
  
  // Actions
  canSave: boolean;
  onSave: () => Promise<void>;
  onReset: () => void;
}

/**
 * Hook for anesthesia tab
 */
export function useAnesthesiaTab(caseId: string): UseAnesthesiaTabResult {
  const queryClient = useQueryClient();
  const { data, isLoading, error, refetch } = useSurgicalCasePlanPage(caseId);
  
  // Local editable state
  const [localAnesthesiaPlan, setLocalAnesthesiaPlan] = useState<AnesthesiaType | null>(null);
  const [localSpecialInstructions, setLocalSpecialInstructions] = useState('');
  const [localEstimatedDurationMinutes, setLocalEstimatedDurationMinutes] = useState('');
  
  // Initialize from server data
  useEffect(() => {
    if (data) {
      setLocalAnesthesiaPlan((data.casePlan?.anesthesiaPlan as AnesthesiaType) || null);
      setLocalSpecialInstructions(data.casePlan?.specialInstructions || '');
      setLocalEstimatedDurationMinutes(
        data.casePlan?.estimatedDurationMinutes?.toString() || ''
      );
    }
  }, [data]);
  
  // Build view model
  const viewModel: AnesthesiaViewModel | null = data
    ? {
        anesthesiaPlan: localAnesthesiaPlan,
        specialInstructions: localSpecialInstructions,
        estimatedDurationMinutes: localEstimatedDurationMinutes
          ? parseInt(localEstimatedDurationMinutes, 10)
          : null,
      }
    : null;
  
  // Check if dirty
  const isDirty =
    localAnesthesiaPlan !== ((data?.casePlan?.anesthesiaPlan as AnesthesiaType) || null) ||
    localSpecialInstructions !== (data?.casePlan?.specialInstructions || '') ||
    localEstimatedDurationMinutes !== (data?.casePlan?.estimatedDurationMinutes?.toString() || '');
  
  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      const durMinutes = localEstimatedDurationMinutes
        ? parseInt(localEstimatedDurationMinutes, 10)
        : null;
      const payload = buildUpdateAnesthesiaPayload(
        localAnesthesiaPlan,
        localSpecialInstructions,
        durMinutes
      );
      const validated = parseUpdateAnesthesiaRequest(payload);
      const response = await surgicalPlanApi.patchAnesthesia(caseId, validated);
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to save anesthesia plan');
      }
      
      return response.data;
    },
    onSuccess: () => {
      toast.success('Anesthesia plan saved successfully');
      queryClient.invalidateQueries({ queryKey: ['surgical-plan', 'case-plan', caseId] });
      refetch();
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to save anesthesia plan');
    },
  });
  
  const onSave = useCallback(async () => {
    await saveMutation.mutateAsync();
  }, [saveMutation]);
  
  const onReset = useCallback(() => {
    if (data) {
      setLocalAnesthesiaPlan((data.casePlan?.anesthesiaPlan as AnesthesiaType) || null);
      setLocalSpecialInstructions(data.casePlan?.specialInstructions || '');
      setLocalEstimatedDurationMinutes(
        data.casePlan?.estimatedDurationMinutes?.toString() || ''
      );
    }
  }, [data]);
  
  return {
    viewModel,
    isLoading,
    isSaving: saveMutation.isPending,
    error: error as Error | null,
    localAnesthesiaPlan,
    localSpecialInstructions,
    localEstimatedDurationMinutes,
    setAnesthesiaPlan: setLocalAnesthesiaPlan,
    setSpecialInstructions: setLocalSpecialInstructions,
    setEstimatedDurationMinutes: setLocalEstimatedDurationMinutes,
    canSave: isDirty && !saveMutation.isPending,
    onSave,
    onReset,
  };
}

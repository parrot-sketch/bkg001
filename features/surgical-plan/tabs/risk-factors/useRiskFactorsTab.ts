/**
 * Hook: useRiskFactorsTab
 * 
 * Data loading and actions for risk factors tab.
 * No JSX returned - pure logic only.
 */

import { useState, useCallback, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { surgicalPlanApi } from '../../shared/api/surgicalPlanApi';
import { parseUpdateRiskFactorsRequest } from './riskFactorsParsers';
import { buildUpdateRiskFactorsPayload, insertPreOpTemplate } from './riskFactorsMappers';
import { useSurgicalCasePlanPage } from '../../shared/hooks/useSurgicalCasePlanPage';

interface RiskFactorsViewModel {
  riskFactors: string;
  preOpNotes: string;
}

interface UseRiskFactorsTabResult {
  // Data
  viewModel: RiskFactorsViewModel | null;
  
  // Loading states
  isLoading: boolean;
  isSaving: boolean;
  
  // Errors
  error: Error | null;
  
  // Editing state
  localRiskFactors: string;
  localPreOpNotes: string;
  setRiskFactors: (value: string) => void;
  setPreOpNotes: (value: string) => void;
  
  // Actions
  canSave: boolean;
  onSave: () => Promise<void>;
  onReset: () => void;
  onInsertTemplate: () => void;
  showTemplateDialog: boolean;
  setShowTemplateDialog: (show: boolean) => void;
}

/**
 * Hook for risk factors tab
 */
export function useRiskFactorsTab(caseId: string): UseRiskFactorsTabResult {
  const queryClient = useQueryClient();
  const { data, isLoading, error, refetch } = useSurgicalCasePlanPage(caseId);
  
  // Local editable state
  const [localRiskFactors, setLocalRiskFactors] = useState('');
  const [localPreOpNotes, setLocalPreOpNotes] = useState('');
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  
  // Initialize from server data
  useEffect(() => {
    if (data) {
      setLocalRiskFactors(data.casePlan?.riskFactors || '');
      setLocalPreOpNotes(data.casePlan?.preOpNotes || '');
    }
  }, [data]);
  
  // Build view model
  const viewModel: RiskFactorsViewModel | null = data
    ? {
        riskFactors: localRiskFactors,
        preOpNotes: localPreOpNotes,
      }
    : null;
  
  // Check if dirty
  const isDirty =
    localRiskFactors !== (data?.casePlan?.riskFactors || '') ||
    localPreOpNotes !== (data?.casePlan?.preOpNotes || '');
  
  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = buildUpdateRiskFactorsPayload(localRiskFactors, localPreOpNotes);
      const validated = parseUpdateRiskFactorsRequest(payload);
      const response = await surgicalPlanApi.patchRiskFactors(caseId, validated);
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to save risk factors');
      }
      
      return response.data;
    },
    onSuccess: () => {
      toast.success('Risk factors saved successfully');
      queryClient.invalidateQueries({ queryKey: ['surgical-plan', 'case-plan', caseId] });
      refetch();
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to save risk factors');
    },
  });
  
  const onSave = useCallback(async () => {
    await saveMutation.mutateAsync();
  }, [saveMutation]);
  
  const onReset = useCallback(() => {
    if (data) {
      setLocalRiskFactors(data.casePlan?.riskFactors || '');
      setLocalPreOpNotes(data.casePlan?.preOpNotes || '');
    }
  }, [data]);
  
  const onInsertTemplate = useCallback(() => {
    const result = insertPreOpTemplate(localPreOpNotes);
    if (result.changed) {
      setLocalPreOpNotes(result.nextHtml);
      setShowTemplateDialog(false);
    }
  }, [localPreOpNotes]);
  
  return {
    viewModel,
    isLoading,
    isSaving: saveMutation.isPending,
    error: error as Error | null,
    localRiskFactors,
    localPreOpNotes,
    setRiskFactors: setLocalRiskFactors,
    setPreOpNotes: setLocalPreOpNotes,
    canSave: isDirty && !saveMutation.isPending,
    onSave,
    onReset,
    onInsertTemplate,
    showTemplateDialog,
    setShowTemplateDialog,
  };
}

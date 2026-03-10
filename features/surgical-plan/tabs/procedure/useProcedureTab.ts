/**
 * Hook: useProcedureTab
 * 
 * Data loading and actions for procedure tab.
 * No JSX returned - pure logic only.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { surgicalPlanApi } from '../../shared/api/surgicalPlanApi';
import { useSurgicalCasePlanPage } from '../../shared/hooks/useSurgicalCasePlanPage';
import { useServices } from '@/hooks/useServices';
import { parseUpdateProcedureRequest } from './procedureParsers';
import { buildUpdateProcedurePayload } from './procedureMappers';

interface ProcedureViewModel {
  procedureName: string;
  procedurePlan: string;
}

interface UseProcedureTabResult {
  // Data
  viewModel: ProcedureViewModel | null;
  services: { id: string; name: string; category: string }[];
  servicesLoading: boolean;
  
  // Loading states
  isLoading: boolean;
  isSaving: boolean;
  
  // Errors
  error: Error | null;
  
  // Editing state
  localProcedureName: string;
  localProcedurePlan: string;
  setProcedureName: (value: string) => void;
  setProcedurePlan: (value: string) => void;
  
  // Actions
  canSave: boolean;
  onSave: () => Promise<void>;
  onReset: () => void;
}

/**
 * Hook for procedure tab
 */
export function useProcedureTab(caseId: string): UseProcedureTabResult {
  const queryClient = useQueryClient();
  const { data, isLoading, error, refetch } = useSurgicalCasePlanPage(caseId);
  const { services, loading: servicesLoading } = useServices();
  
  // Local editable state
  const [localProcedureName, setLocalProcedureName] = useState('');
  const [localProcedurePlan, setLocalProcedurePlan] = useState('');
  
  // Track if we've initialized to prevent resetting state on every data refetch
  const hasInitialized = useRef(false);
  
  // Initialize from server data only once
  useEffect(() => {
    if (data && !hasInitialized.current) {
      setLocalProcedureName(data.case?.procedureName || '');
      setLocalProcedurePlan(data.casePlan?.procedurePlan || '');
      hasInitialized.current = true;
    }
  }, [data?.case?.procedureName, data?.casePlan?.procedurePlan]);
  
  // Build view model
  const viewModel: ProcedureViewModel | null = data
    ? {
        procedureName: localProcedureName,
        procedurePlan: localProcedurePlan,
      }
    : null;
  
  // Check if dirty
  const isDirty =
    localProcedureName !== (data?.case?.procedureName || '') ||
    localProcedurePlan !== (data?.casePlan?.procedurePlan || '');
  
  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = buildUpdateProcedurePayload(localProcedureName, localProcedurePlan);
      const validated = parseUpdateProcedureRequest(payload);
      const response = await surgicalPlanApi.patchProcedurePlan(caseId, validated);
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to save procedure plan');
      }
      
      return response.data;
    },
    onSuccess: () => {
      toast.success('Procedure plan saved successfully');
      queryClient.invalidateQueries({ queryKey: ['surgical-plan', 'case-plan', caseId] });
      refetch();
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to save procedure plan');
    },
  });
  
  const onSave = useCallback(async () => {
    await saveMutation.mutateAsync();
  }, [saveMutation]);
  
  const onReset = useCallback(() => {
    if (data) {
      setLocalProcedureName(data.case?.procedureName || '');
      setLocalProcedurePlan(data.casePlan?.procedurePlan || '');
    }
  }, [data]);

  // Map all services for the dropdown - include all categories
  const procedureServices = services.map(s => ({
    id: String(s.id),
    name: s.service_name,
    category: s.category || ''
  }));
  
  return {
    viewModel,
    services: procedureServices,
    servicesLoading,
    isLoading,
    isSaving: saveMutation.isPending,
    error: error as Error | null,
    localProcedureName,
    localProcedurePlan,
    setProcedureName: setLocalProcedureName,
    setProcedurePlan: setLocalProcedurePlan,
    canSave: isDirty && !saveMutation.isPending,
    onSave,
    onReset,
  };
}

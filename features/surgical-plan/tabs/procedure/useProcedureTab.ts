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
  equipmentNotes: string;
  patientPositioning: string;
  surgeonNarrative: string;
  postOpInstructions: string;
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
  localEquipmentNotes: string;
  localPatientPositioning: string;
  localSurgeonNarrative: string;
  localPostOpInstructions: string;
  setProcedureName: (value: string) => void;
  setProcedurePlan: (value: string) => void;
  setEquipmentNotes: (value: string) => void;
  setPatientPositioning: (value: string) => void;
  setSurgeonNarrative: (value: string) => void;
  setPostOpInstructions: (value: string) => void;
  
  // Actions
  canSave: boolean;
  canEdit: boolean;
  onSave: () => Promise<void>;
  onReset: () => void;
}

/**
 * Hook for procedure tab
 */
export function useProcedureTab(caseId: string): UseProcedureTabResult {
  const queryClient = useQueryClient();
  const { data, isLoading, error, refetch, canEdit } = useSurgicalCasePlanPage(caseId);
  const { services, loading: servicesLoading } = useServices();
  
  // Local editable state
  const [localProcedureName, setLocalProcedureName] = useState('');
  const [localProcedurePlan, setLocalProcedurePlan] = useState('');
  const [localEquipmentNotes, setLocalEquipmentNotes] = useState('');
  const [localPatientPositioning, setLocalPatientPositioning] = useState('');
  const [localSurgeonNarrative, setLocalSurgeonNarrative] = useState('');
  const [localPostOpInstructions, setLocalPostOpInstructions] = useState('');
  
  // Track if we've initialized to prevent resetting state on every data refetch
  const hasInitialized = useRef(false);
  
  // Initialize from server data only once
  useEffect(() => {
    if (data && !hasInitialized.current) {
      setLocalProcedureName(data.case?.procedureName || '');
      const cp: any = data.casePlan || {};
      setLocalProcedurePlan(cp.procedurePlan || '');
      setLocalEquipmentNotes(cp.equipmentNotes || '');
      setLocalPatientPositioning(cp.patientPositioning || '');
      setLocalSurgeonNarrative(cp.surgeonNarrative || '');
      setLocalPostOpInstructions(cp.postOpInstructions || '');
      hasInitialized.current = true;
    }
  }, [data]);
  
  // Build view model
  const viewModel: ProcedureViewModel | null = data
    ? {
        procedureName: localProcedureName,
        procedurePlan: localProcedurePlan,
        equipmentNotes: localEquipmentNotes,
        patientPositioning: localPatientPositioning,
        surgeonNarrative: localSurgeonNarrative,
        postOpInstructions: localPostOpInstructions,
      }
    : null;
  
  // Check if dirty
  const cp: any = data?.casePlan || {};
  const isDirty =
    localProcedureName !== (data?.case?.procedureName || '') ||
    localProcedurePlan !== (cp.procedurePlan || '') ||
    localEquipmentNotes !== (cp.equipmentNotes || '') ||
    localPatientPositioning !== (cp.patientPositioning || '') ||
    localSurgeonNarrative !== (cp.surgeonNarrative || '') ||
    localPostOpInstructions !== (cp.postOpInstructions || '');
  
  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = buildUpdateProcedurePayload(
        localProcedureName, 
        localProcedurePlan,
        localEquipmentNotes,
        localPatientPositioning,
        localSurgeonNarrative,
        localPostOpInstructions
      );
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
      const cp: any = data.casePlan || {};
      setLocalProcedurePlan(cp.procedurePlan || '');
      setLocalEquipmentNotes(cp.equipmentNotes || '');
      setLocalPatientPositioning(cp.patientPositioning || '');
      setLocalSurgeonNarrative(cp.surgeonNarrative || '');
      setLocalPostOpInstructions(cp.postOpInstructions || '');
    }
  }, [data]);

  // Map only services with 'Procedure' category for the dropdown
  const procedureServices = services
    .filter(s => s.category === 'Procedure')
    .map(s => ({
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
    localEquipmentNotes,
    localPatientPositioning,
    localSurgeonNarrative,
    localPostOpInstructions,
    setProcedureName: setLocalProcedureName,
    setProcedurePlan: setLocalProcedurePlan,
    setEquipmentNotes: setLocalEquipmentNotes,
    setPatientPositioning: setLocalPatientPositioning,
    setSurgeonNarrative: setLocalSurgeonNarrative,
    setPostOpInstructions: setLocalPostOpInstructions,
    canSave: isDirty && !saveMutation.isPending && canEdit,
    canEdit: !!canEdit,
    onSave,
    onReset,
  };
}

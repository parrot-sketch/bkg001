/**
 * Doctor Intra-Operative Record Hook
 * 
 * Handles form state, data loading, auto-save, and workflow transitions.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSurgicalCasePlanPage } from '@/features/surgical-plan';
import { toast } from 'sonner';

export interface DoctorIntraOpFormData {
    date: string;
    surgicalTeam: {
        surgeon: string;
        anaesthesiologist: string;
        assistants: string;
        scrubNurse: string;
        circulatingNurse: string;
    };
    diagnosis: {
        preOperative: string;
        operative: string;
    };
    procedure: {
        planned: string;
        performed: string;
    };
    procedureNotes: string;
    additionalNotes: string;
    postOpInstructions: string;
    safetyChecklist: {
        swabCountCorrect: boolean;
        instrumentCountCorrect: boolean;
        specimenLabeled: boolean;
        equipmentReturned: boolean;
        complicationsDocumented: boolean;
    };
    signatures: {
        surgeon?: {
            name: string;
            timestamp: string;
        };
    };
}

export const initialFormData: DoctorIntraOpFormData = {
    date: '',
    surgicalTeam: {
        surgeon: '',
        anaesthesiologist: '',
        assistants: '',
        scrubNurse: '',
        circulatingNurse: '',
    },
    diagnosis: {
        preOperative: '',
        operative: '',
    },
    procedure: {
        planned: '',
        performed: '',
    },
    procedureNotes: '',
    additionalNotes: '',
    postOpInstructions: '',
    safetyChecklist: {
        swabCountCorrect: false,
        instrumentCountCorrect: false,
        specimenLabeled: false,
        equipmentReturned: false,
        complicationsDocumented: false,
    },
    signatures: {},
};

interface UseDoctorIntraOpOptions {
    caseId: string;
    user?: {
        firstName?: string | null;
        lastName?: string | null;
        email?: string | null;
    } | null;
}

interface UseDoctorIntraOpReturn {
    loading: boolean;
    error: Error | null;
    surgicalCase: {
        id: string;
        status: string;
        diagnosis: string;
        procedure_name: string;
        side: string;
        patient: {
            id: string;
            first_name: string;
            last_name: string;
            file_number: string;
            allergies: string;
        } | null;
    } | null;
    formData: DoctorIntraOpFormData;
    isDirty: boolean;
    isSaving: boolean;
    isFinalized: boolean;
    updateField: (path: string, value: any) => void;
    save: () => Promise<void>;
    finalize: (signature: string) => Promise<boolean>;
    canTransition: (targetStatus: string) => boolean;
    transitionTo: (targetStatus: string) => Promise<boolean>;
}

export function useDoctorIntraOp({
    caseId,
    user,
}: UseDoctorIntraOpOptions): UseDoctorIntraOpReturn {
    const { isLoading: caseLoading, error: caseError, data: caseData } = useSurgicalCasePlanPage(caseId);
    
    const [surgicalCase, setSurgicalCase] = useState<UseDoctorIntraOpReturn['surgicalCase']>(null);
    const [formData, setFormData] = useState<DoctorIntraOpFormData>(initialFormData);
    const [isDirty, setIsDirty] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isFinalized, setIsFinalized] = useState(false);
    const [loading, setLoading] = useState(true);
    
    const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
    const lastSavedRef = useRef<string>('');

    // Load case data when caseData changes
    useEffect(() => {
        if (caseLoading || !caseData) return;
        
        const caseInfo = caseData.case;
        setSurgicalCase({
            id: caseInfo.id,
            status: caseInfo.status,
            diagnosis: caseInfo.diagnosis || '',
            procedure_name: caseInfo.procedureName || '',
            side: caseInfo.side || '',
            patient: caseData.patient ? {
                id: caseData.patient.id,
                first_name: caseData.patient.fullName.split(' ')[0],
                last_name: caseData.patient.fullName.split(' ').slice(1).join(' '),
                file_number: caseData.patient.fileNumber || '',
                allergies: caseData.patient.allergies || '',
            } : null,
        });

        // Pre-populate from case
        const surgeonName = caseData.primarySurgeon?.name || '';
        const userName = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : '';
        
        setFormData(prev => ({
            ...prev,
            date: new Date().toISOString().split('T')[0],
            surgicalTeam: {
                ...prev.surgicalTeam,
                surgeon: surgeonName || userName || '',
            },
            diagnosis: {
                preOperative: caseInfo.diagnosis || '',
                operative: '',
            },
            procedure: {
                planned: caseInfo.procedureName || '',
                performed: caseInfo.procedureName || '',
            },
        }));
        
        // Check if already finalized based on status
        setIsFinalized(caseInfo.status === 'RECOVERY' || caseInfo.status === 'COMPLETED');
        setLoading(false);
    }, [caseData, caseLoading, user]);

    // Auto-save every 30 seconds when dirty
    useEffect(() => {
        if (!isDirty || isFinalized || !surgicalCase) return;
        
        autoSaveTimerRef.current = setTimeout(() => {
            save();
        }, 30000);

        return () => {
            if (autoSaveTimerRef.current) {
                clearTimeout(autoSaveTimerRef.current);
            }
        };
    }, [isDirty, isFinalized, surgicalCase]);

    // Update field with nested object support
    const updateField = useCallback((path: string, value: any) => {
        setFormData(prev => {
            const keys = path.split('.');
            const result = { ...prev };
            let current: any = result;
            for (let i = 0; i < keys.length - 1; i++) {
                current[keys[i]] = { ...current[keys[i]] };
                current = current[keys[i]];
            }
            current[keys[keys.length - 1]] = value;
            return result;
        });
        setIsDirty(true);
    }, []);

    // Save form data to API
    const save = useCallback(async () => {
        if (!caseId || isSaving || !surgicalCase) return;
        
        setIsSaving(true);
        try {
            const res = await fetch(`/api/doctor/surgical-cases/${caseId}/forms/intra-op`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });
            const json = await res.json();
            if (json.success) {
                setIsDirty(false);
                lastSavedRef.current = JSON.stringify(formData);
            } else {
                toast.error('Failed to save: ' + json.error);
            }
        } catch (err) {
            console.error('Save failed:', err);
            toast.error('Failed to save operative record');
        } finally {
            setIsSaving(false);
        }
    }, [caseId, formData, isSaving, surgicalCase]);

    // Finalize the record with signature
    const finalize = useCallback(async (signature: string): Promise<boolean> => {
        if (!signature.trim()) {
            toast.error('Signature is required');
            return false;
        }

        // Update form with signature
        setFormData(prev => ({
            ...prev,
            signatures: {
                surgeon: {
                    name: signature,
                    timestamp: new Date().toISOString(),
                }
            }
        }));

        try {
            const res = await fetch(`/api/doctor/surgical-cases/${caseId}/forms/intra-op`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ signature }),
            });
            const json = await res.json();
            
            if (json.success) {
                setIsFinalized(true);
                setIsDirty(false);
                toast.success('Operative record finalized successfully');
                return true;
            } else {
                toast.error('Failed to finalize: ' + json.error);
                return false;
            }
        } catch (err) {
            console.error('Finalize failed:', err);
            toast.error('Failed to finalize operative record');
            return false;
        }
    }, [caseId]);

    // Check if can transition to target status
    const canTransition = useCallback((targetStatus: string): boolean => {
        if (!surgicalCase) return false;
        
        const currentStatus = surgicalCase.status;
        
        // Define valid transitions
        const transitions: Record<string, string[]> = {
            'RECOVERY': ['IN_THEATER'],
            'COMPLETED': ['RECOVERY'],
        };
        
        return transitions[targetStatus]?.includes(currentStatus) || false;
    }, [surgicalCase]);

    // Transition case to new status
    const transitionTo = useCallback(async (targetStatus: string): Promise<boolean> => {
        if (!canTransition(targetStatus)) {
            toast.error(`Cannot transition from ${surgicalCase?.status} to ${targetStatus}`);
            return false;
        }

        try {
            const res = await fetch(`/api/doctor/surgical-cases/${caseId}/transition`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: targetStatus }),
            });
            const json = await res.json();
            
            if (json.success) {
                setSurgicalCase(prev => prev ? { ...prev, status: targetStatus } : null);
                toast.success(`Case transitioned to ${targetStatus}`);
                return true;
            } else {
                toast.error('Failed to transition: ' + json.error);
                return false;
            }
        } catch (err) {
            console.error('Transition failed:', err);
            toast.error('Failed to transition case status');
            return false;
        }
    }, [caseId, canTransition, surgicalCase]);

    return {
        loading: loading || caseLoading,
        error: caseError,
        surgicalCase,
        formData,
        isDirty,
        isSaving,
        isFinalized,
        updateField,
        save,
        finalize,
        canTransition,
        transitionTo,
    };
}

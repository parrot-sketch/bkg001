'use client';

import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { PatientResponseDto } from '@/application/dtos/PatientResponseDto';

interface UsePatientRegistrationOptions {
  /**
   * Query-key namespace used when invalidating the registry list + stats.
   * Defaults to `'frontdesk'` so existing frontdesk callers are unchanged.
   * The theater-tech registry passes `'theater-tech'`.
   */
  queryKeyPrefix?: string;
  /**
   * Invoked after the dialog closes and caches are invalidated. Receives the
   * newly registered patient so role-specific surfaces can react (e.g. open the
   * patient drawer and prompt to schedule a procedure).
   */
  onPatientRegistered?: (patient: PatientResponseDto) => void;
}

interface UsePatientRegistrationReturn {
  isOpen: boolean;
  openDialog: () => void;
  closeDialog: () => void;
  handleSuccess: (patient?: PatientResponseDto) => void;
}

/**
 * Manages the patient registration dialog lifecycle.
 *
 * On success it invalidates both the patient list and stats caches under the
 * configured query-key prefix so the table and stat cards refresh automatically.
 */
export function usePatientRegistration(options: UsePatientRegistrationOptions = {}): UsePatientRegistrationReturn {
  const { queryKeyPrefix = 'frontdesk', onPatientRegistered } = options;
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);

  const openDialog = useCallback(() => setIsOpen(true), []);
  const closeDialog = useCallback(() => setIsOpen(false), []);

  const handleSuccess = useCallback((patient?: PatientResponseDto) => {
    setIsOpen(false);
    queryClient.invalidateQueries({ queryKey: [queryKeyPrefix, 'patients'] });
    queryClient.invalidateQueries({ queryKey: [queryKeyPrefix, 'patient-stats'] });
    if (patient) {
      onPatientRegistered?.(patient);
    }
  }, [queryClient, queryKeyPrefix, onPatientRegistered]);

  return { isOpen, openDialog, closeDialog, handleSuccess };
}

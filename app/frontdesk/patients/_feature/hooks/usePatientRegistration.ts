'use client';

import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';

interface UsePatientRegistrationReturn {
  isOpen: boolean;
  openDialog: () => void;
  closeDialog: () => void;
  handleSuccess: () => void;
}

/**
 * Manages the patient registration dialog lifecycle.
 *
 * On success it invalidates both the patient list and stats caches so
 * the table and stat cards refresh automatically.
 */
export function usePatientRegistration(): UsePatientRegistrationReturn {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);

  const openDialog = useCallback(() => setIsOpen(true), []);
  const closeDialog = useCallback(() => setIsOpen(false), []);

  const handleSuccess = useCallback(() => {
    setIsOpen(false);
    queryClient.invalidateQueries({ queryKey: ['frontdesk', 'patients'] });
    queryClient.invalidateQueries({ queryKey: ['frontdesk', 'patient-stats'] });
  }, [queryClient]);

  return { isOpen, openDialog, closeDialog, handleSuccess };
}

'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface UsePatientDrawerReturn {
  patientId: string | null;
  isOpen: boolean;
  openDrawer: (patientId: string) => void;
  closeDrawer: () => void;
  handleNavigate: (patientId: string) => void;
}

/**
 * Manages the patient detail drawer's open/close state and the selected patient.
 *
 * Navigation (View Full Profile) is handled here so the page doesn't
 * need to know the route structure.
 */
export function usePatientDrawer(): UsePatientDrawerReturn {
  const router = useRouter();
  const [patientId, setPatientId] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const openDrawer = useCallback((id: string) => {
    setPatientId(id);
    setIsOpen(true);
  }, []);

  const closeDrawer = useCallback(() => {
    setIsOpen(false);
  }, []);

  const handleNavigate = useCallback(
    (id: string) => {
      setIsOpen(false);
      router.push(`/frontdesk/patient/${id}`);
    },
    [router],
  );

  return { patientId, isOpen, openDrawer, closeDrawer, handleNavigate };
}

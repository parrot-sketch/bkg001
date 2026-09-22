'use client';

import { useState, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';

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
 * Navigation (View Full Profile) stays inside the active role shell when possible.
 */
export function usePatientDrawer(): UsePatientDrawerReturn {
  const router = useRouter();
  const pathname = usePathname();
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
      if (pathname?.startsWith('/nurse')) {
        router.push(`/nurse/patients/${id}`);
        return;
      }
      if (pathname?.startsWith('/theater-tech')) {
        router.push(`/theater-tech/patients`);
        return;
      }
      router.push(`/frontdesk/patient/${id}`);
    },
    [pathname, router],
  );

  return { patientId, isOpen, openDrawer, closeDrawer, handleNavigate };
}

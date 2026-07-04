'use client';

import { useState, useEffect, useCallback } from 'react';
import { frontdeskApi } from '@/lib/api/frontdesk';
import type { PatientRegistryDto } from '@/application/dtos/PatientRegistryDto';
import { mapResponseToRegistry } from '../utils/patientMapper';
import { RECENT_MAX } from '../constants/filters';

interface UseRecentPatientsReturn {
  patients: ReadonlyArray<PatientRegistryDto>;
  loading: boolean;
  /** Call this when a patient is selected to record them as recently viewed. */
  addToRecent: (patientId: string) => void;
}

const STORAGE_KEY = 'recentPatients';

function readStoredIds(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return (JSON.parse(raw) as string[]).slice(0, RECENT_MAX);
  } catch {
    return [];
  }
}

function writeStoredIds(ids: string[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  } catch {
    // Silently ignore storage errors (e.g. private browsing quota exceeded).
  }
}

/**
 * Manages the "Recently Viewed" patient strip.
 *
 * All localStorage reads and writes are encapsulated here — no component
 * should ever call localStorage directly for this feature.
 *
 * IDs are loaded from storage on mount, then the hook batch-fetches the
 * corresponding patients from the API and maps them to `PatientRegistryDto`.
 */
export function useRecentPatients(): UseRecentPatientsReturn {
  const [ids, setIds] = useState<string[]>([]);
  const [patients, setPatients] = useState<PatientRegistryDto[]>([]);
  const [loading, setLoading] = useState(true);

  // Load IDs from localStorage on mount.
  useEffect(() => {
    setIds(readStoredIds());
  }, []);

  // Fetch patient data whenever the ID list changes.
  useEffect(() => {
    if (ids.length === 0) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    Promise.all(
      ids.map((id) =>
        frontdeskApi
          .getPatient(id)
          .then((res) => (res.success ? res.data : null))
          .catch(() => null),
      ),
    )
      .then((results) => {
        if (cancelled) return;
        const mapped = results
          .filter(Boolean)
          .map((raw) => mapResponseToRegistry(raw!));
        setPatients(mapped);
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [ids]);

  const addToRecent = useCallback((patientId: string) => {
    setIds((prev) => {
      const next = [patientId, ...prev.filter((id) => id !== patientId)].slice(
        0,
        RECENT_MAX,
      );
      writeStoredIds(next);
      return next;
    });
  }, []);

  return { patients, loading, addToRecent };
}

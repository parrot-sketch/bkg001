'use client';

import { useCallback } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import type { PatientUrlState, PatientUrlActions } from '../types/patient-page';

/**
 * Single source of truth for all URL search-param reads and writes on the
 * patient registry page.
 *
 * No other file in this feature should import `useSearchParams` or
 * manipulate `URLSearchParams` directly.
 */
export function usePatientUrlState(): PatientUrlState & PatientUrlActions {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // ── Parsed state ──────────────────────────────────────────────────────────

  const page = Number(searchParams.get('page')) || 1;
  const search = searchParams.get('q') ?? '';
  const createdToday = searchParams.get('createdToday') === 'true';
  const createdThisMonth = searchParams.get('createdThisMonth') === 'true';
  const isSelectionMode = searchParams.get('mode') === 'book';

  // ── Helpers ───────────────────────────────────────────────────────────────

  /** Build a fresh URLSearchParams from the current params, apply a mutation, then push. */
  const push = useCallback(
    (mutate: (params: URLSearchParams) => void) => {
      const params = new URLSearchParams(searchParams.toString());
      mutate(params);
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [router, pathname, searchParams],
  );

  const replace = useCallback(
    (mutate: (params: URLSearchParams) => void) => {
      const params = new URLSearchParams(searchParams.toString());
      mutate(params);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [router, pathname, searchParams],
  );

  // ── Actions ───────────────────────────────────────────────────────────────

  const setPage = useCallback(
    (newPage: number) => {
      push((p) => {
        if (newPage > 1) p.set('page', newPage.toString());
        else p.delete('page');
      });
    },
    [push],
  );

  const setFilter = useCallback(
    (key: 'createdToday' | 'createdThisMonth', value: boolean) => {
      push((p) => {
        p.delete('q');
        p.delete('page');
        if (value) p.set(key, 'true');
        else p.delete(key);
      });
    },
    [push],
  );

  const clearAll = useCallback(() => {
    push((p) => {
      p.delete('q');
      p.delete('createdToday');
      p.delete('createdThisMonth');
      p.delete('page');
    });
  }, [push]);

  const exitSelectionMode = useCallback(() => {
    replace((p) => {
      p.delete('mode');
    });
  }, [replace]);

  return {
    // State
    page,
    search,
    createdToday,
    createdThisMonth,
    isSelectionMode,
    // Actions
    setPage,
    setFilter,
    clearAll,
    exitSelectionMode,
  };
}

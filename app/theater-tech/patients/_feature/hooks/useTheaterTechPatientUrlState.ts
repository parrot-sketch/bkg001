'use client';

import { useCallback } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import type { PatientUrlState, PatientUrlActions } from '../types/patient-page';

export function useTheaterTechPatientUrlState(): PatientUrlState & PatientUrlActions {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const page = Number(searchParams.get('page')) || 1;
  const search = searchParams.get('q') ?? '';
  const createdToday = searchParams.get('createdToday') === 'true';
  const createdThisMonth = searchParams.get('createdThisMonth') === 'true';

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

  const setSearch = useCallback(
    (search: string) => {
      replace((p) => {
        if (search) p.set('q', search);
        else p.delete('q');
        p.delete('page');
      });
    },
    [replace],
  );

  return {
    page,
    search,
    createdToday,
    createdThisMonth,
    setPage,
    setFilter,
    setSearch,
    clearAll,
  };
}

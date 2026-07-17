'use client';

import { useState, useCallback, useMemo } from 'react';

export interface DoctorPatientsPagination {
  page: number;
  totalPages: number;
  start: number;
  end: number;
  next: () => void;
  previous: () => void;
  setPage: (page: number) => void;
}

export function useDoctorPatientsPagination(
  total: number,
  pageSize = 15
): DoctorPatientsPagination {
  const [page, setPage] = useState(1);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total, pageSize]);
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  const clampPage = useCallback(
    (p: number) => Math.max(1, Math.min(totalPages, p)),
    [totalPages]
  );

  const next = useCallback(() => setPage((p) => clampPage(p + 1)), [clampPage]);
  const previous = useCallback(() => setPage((p) => clampPage(p - 1)), [clampPage]);

  return {
    page,
    totalPages,
    start,
    end,
    next,
    previous,
    setPage: (p) => setPage(clampPage(p)),
  };
}

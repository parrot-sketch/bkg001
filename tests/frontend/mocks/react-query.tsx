/**
 * React Query Mocks
 *
 * Provides helpers for testing components that use TanStack Query.
 */

import React, { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

export function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: Infinity,
      },
    },
  });
}

export function QueryWrapper({ children, queryClient }: {
  children: ReactNode;
  queryClient?: QueryClient;
}): React.ReactElement {
  const client = queryClient ?? createTestQueryClient();
  return (
    <QueryClientProvider client={client}>
      {children}
    </QueryClientProvider>
  );
}

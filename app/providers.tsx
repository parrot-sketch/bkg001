'use client';

/**
 * App Providers
 * 
 * Centralized provider setup for the application.
 * Includes React Query provider for server state management.
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, ReactNode } from 'react';

export function Providers({ children }: { children: ReactNode }) {
  // Create QueryClient with sensible defaults for clinical workstation
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Always fresh for clinical data
            staleTime: 0,
            // Retry network errors with exponential backoff
            retry: 3,
            retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
            // Refetch on window focus for clinical safety
            refetchOnWindowFocus: true,
            // Don't refetch on reconnect for consultation sessions (might interrupt)
            refetchOnReconnect: false,
          },
          mutations: {
            // Retry failed mutations
            retry: 1,
            // Retry delay for mutations
            retryDelay: 1000,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}

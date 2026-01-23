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
  // CRITICAL FIX: Disabled refetchOnWindowFocus to prevent "Connection closed" errors
  // The API client now handles cache-busting, so we don't need aggressive refetching
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
            // CRITICAL: Disable refetch on window focus to prevent "Connection closed" errors
            // The API client handles cache-busting, so fresh data is fetched when needed
            refetchOnWindowFocus: false,
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

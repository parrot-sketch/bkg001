'use client';

/**
 * App Providers
 * 
 * Centralized provider setup for the application.
 * Includes React Query provider for server state management.
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { AuthProvider } from "@/contexts/AuthContext";

export function Providers({ children }: { children: React.ReactNode }) {
  // Create QueryClient with network resilience configuration
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Minimum stale time to prevent over-fetching
            staleTime: 1000 * 30, // 30 seconds
            // Retry network errors with exponential backoff
            retry: 3,
            retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
            // Disable refetch on window focus to prevent issues during poor network
            refetchOnWindowFocus: false,
            // Disable refetch on reconnect for better resilience
            refetchOnReconnect: false,
            // Abort query if network is offline
            networkMode: 'offlineFirst',
          },
          mutations: {
            // Retry failed mutations once
            retry: 1,
            // Retry delay for mutations
            retryDelay: 1000,
            // Use offlineFirst for mutations too
            networkMode: 'offlineFirst',
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        {children}
      </AuthProvider>
    </QueryClientProvider>
  );
}

import { QueryClient } from '@tanstack/react-query';
import { cache } from 'react';

/**
 * Get a request-scoped QueryClient instance on the server.
 * This prevents data leaking between different requests/users.
 */
export const getQueryClient = cache(() => new QueryClient({
  defaultOptions: {
    queries: {
      // 30 seconds stale time
      staleTime: 1000 * 30,
    },
  },
}));

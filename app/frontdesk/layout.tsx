import type { ReactNode } from 'react';
import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { getQueryClient } from '@/lib/react-query-server';
import { getCurrentUser } from '@/lib/auth/server-auth';
import { getFrontdeskDashboardData } from '@/actions/frontdesk/get-dashboard-data';
import { queryKeys } from '@/lib/constants/queryKeys';
import { FrontdeskLayoutClient } from './FrontdeskLayoutClient';

const DESK_ROLES = ['FRONTDESK', 'NURSE', 'THEATER_TECHNICIAN', 'ADMIN'];

/**
 * Seeds the shared frontdesk dashboard query at the layout level so the sidebar
 * (which lives here) and every frontdesk page read the same server-fetched data
 * instead of refetching it after hydration.
 */
export default async function FrontdeskLayout({ children }: { children: ReactNode }) {
  const authUser = await getCurrentUser();

  if (!authUser || !DESK_ROLES.includes(authUser.role)) {
    return <FrontdeskLayoutClient serverUserId={null}>{children}</FrontdeskLayoutClient>;
  }

  const queryClient = getQueryClient();
  try {
    queryClient.setQueryData(
      queryKeys.frontdesk.dashboard(authUser.userId),
      await getFrontdeskDashboardData(),
    );
  } catch (error) {
    console.error('[Frontdesk layout] Dashboard prefetch failed:', error);
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <FrontdeskLayoutClient serverUserId={authUser.userId}>{children}</FrontdeskLayoutClient>
    </HydrationBoundary>
  );
}

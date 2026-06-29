import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { getQueryClient } from '@/lib/react-query-server';
import { getFrontdeskDashboardData } from '@/actions/frontdesk/get-dashboard-data';
import { getDoctorsAvailabilityAction } from '@/actions/frontdesk/get-doctors-availability';
import { getCurrentUser } from '@/lib/auth/server-auth';
import { FrontdeskDashboardClient } from './FrontdeskDashboardClient';

export const revalidate = 0; // Disable static rendering cache to ensure operational dashboards are always dynamic

/**
 * Frontdesk Dashboard Page (Server Component)
 *
 * Prefetches and seeds the React Query cache on the server, avoiding any
 * client-side loading spinners, hydration mismatches, or layout shifts on initial render.
 */
export default async function FrontdeskDashboardPage() {
  const queryClient = getQueryClient();
  const authUser = await getCurrentUser();

  if (!authUser) {
    // Fallback to client layout which handles redirect to login
    return <FrontdeskDashboardClient />;
  }

  const userId = authUser.userId;
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  // Fetch the dashboard and doctor availability data in parallel on the server
  let dashboardData;
  let doctorsAvailability;

  try {
    [dashboardData, doctorsAvailability] = await Promise.all([
      getFrontdeskDashboardData(),
      getDoctorsAvailabilityAction(today, today),
    ]);
  } catch (error) {
    console.error('[Dashboard Server Prefetch] Error prefetching data:', error);
    // If fetching fails, render client component with empty cache so it can handle errors and refetch
    return <FrontdeskDashboardClient />;
  }

  // Pre-seed individual split query keys in the React Query cache
  queryClient.setQueryData(['frontdesk', 'stats', userId], dashboardData);
  queryClient.setQueryData(['frontdesk', 'schedule', 'today', 'current', userId], dashboardData);
  queryClient.setQueryData(['frontdesk', 'checked-in-awaiting-assignment', userId], dashboardData);
  queryClient.setQueryData(['frontdesk', 'live-queue-board', userId], dashboardData);
  
  // Seed the doctor availability query cache
  queryClient.setQueryData(['doctors', 'availability', 'list', todayStr, todayStr], doctorsAvailability);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <FrontdeskDashboardClient />
    </HydrationBoundary>
  );
}

import { FrontdeskDashboardClient } from './FrontdeskDashboardClient';

/**
 * Frontdesk Dashboard Page
 *
 * Dashboard data is prefetched by app/frontdesk/layout.tsx into the shared React Query key.
 */
export default function FrontdeskDashboardPage() {
  return <FrontdeskDashboardClient />;
}

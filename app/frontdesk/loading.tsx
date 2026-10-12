import { FrontdeskPageSkeleton } from '@/components/frontdesk/FrontdeskSkeletons';

/**
 * Shown inside the frontdesk layout while the next route's server work runs,
 * so navigation feels instant instead of freezing on the previous page.
 */
export default function FrontdeskLoading() {
  return <FrontdeskPageSkeleton />;
}

import { ChevronDown, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PatientLoadMoreProps {
  hasMore: boolean;
  loading: boolean;
  onLoadMore: () => void;
  /** Attach to this div to trigger IntersectionObserver auto-load. */
  sentinelRef: React.RefObject<HTMLDivElement | null>;
}

/**
 * Browse-mode footer with a "Load More" button and an invisible sentinel div
 * used by the IntersectionObserver in `usePatientRegistry`.
 * Returns null when there is nothing more to load and no active fetch.
 */
export function PatientLoadMore({ hasMore, loading, onLoadMore, sentinelRef }: PatientLoadMoreProps) {
  if (!hasMore && !loading) return null;

  return (
    <div className="flex items-center justify-center py-3 border-t border-[#e7d6bf]/60">
      {/* Sentinel div observed by the IntersectionObserver */}
      <div ref={sentinelRef} className="absolute bottom-0 h-1 w-full pointer-events-none" />

      {hasMore ? (
        <Button
          variant="outline"
          onClick={onLoadMore}
          disabled={loading}
          className="h-9 px-6 rounded-lg border-[#e7d6bf] text-[#2c2e4b] hover:bg-[#e7d6bf]/30 text-xs font-medium"
        >
          {loading ? (
            <>
              <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin text-[#caa26a]" />
              Loading more...
            </>
          ) : (
            <>
              <ChevronDown className="h-3.5 w-3.5 mr-2 text-[#caa26a]" />
              Load More
            </>
          )}
        </Button>
      ) : (
        <p className="text-xs text-[#2c2e4b]/40">All patients loaded</p>
      )}
    </div>
  );
}

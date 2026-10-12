import { ShimmerSkeleton } from '@/components/ui/shimmer-skeleton';

const NAV_GROUPS = [
  { labelWidth: 'w-14', items: ['w-24', 'w-28', 'w-20'] },
  { labelWidth: 'w-20', items: ['w-32', 'w-24', 'w-28', 'w-20'] },
  { labelWidth: 'w-16', items: ['w-24', 'w-20'] },
];

/** Static stand-in for UnifiedSidebar, matching its expanded desktop layout. */
export function SidebarSkeleton() {
  return (
    <aside
      aria-hidden="true"
      className="fixed left-0 top-0 z-50 hidden h-screen w-[280px] flex-col border-r border-[#e7d6bf]/10 bg-[#2c2e4b] lg:flex"
    >
      <div className="flex h-16 shrink-0 items-center gap-3 border-b border-[#e7d6bf]/10 px-4">
        <ShimmerSkeleton tone="dark" className="h-9 w-9 rounded-lg" />
        <div className="space-y-1.5">
          <ShimmerSkeleton tone="dark" className="h-3 w-28" />
          <ShimmerSkeleton tone="dark" className="h-2 w-16" />
        </div>
      </div>

      <div className="flex-1 space-y-6 overflow-hidden px-3 py-5">
        {NAV_GROUPS.map((group, groupIndex) => (
          <div key={groupIndex} className="space-y-1">
            <ShimmerSkeleton tone="dark" className={`mx-3 mb-3 h-2 ${group.labelWidth}`} />
            {group.items.map((width, itemIndex) => (
              <div key={itemIndex} className="flex items-center gap-3 px-3 py-[9px]">
                <ShimmerSkeleton tone="dark" className="h-4 w-4 rounded" />
                <ShimmerSkeleton tone="dark" className={`h-3 ${width}`} />
              </div>
            ))}
          </div>
        ))}
      </div>

      <div className="flex shrink-0 items-center gap-3 border-t border-[#e7d6bf]/10 p-4">
        <ShimmerSkeleton tone="dark" className="h-9 w-9 rounded-full" />
        <div className="space-y-1.5">
          <ShimmerSkeleton tone="dark" className="h-3 w-24" />
          <ShimmerSkeleton tone="dark" className="h-2 w-14" />
        </div>
      </div>
    </aside>
  );
}

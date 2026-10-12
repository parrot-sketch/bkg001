import { cn } from '@/lib/utils';

type ShimmerTone = 'light' | 'dark';

const toneClasses: Record<ShimmerTone, string> = {
  light: 'bg-[#e7d6bf]/55 before:via-white/70',
  dark: 'bg-white/10 before:via-white/10',
};

interface ShimmerSkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  /** `light` for white/beige surfaces, `dark` for the navy sidebar and page background. */
  tone?: ShimmerTone;
}

/** Placeholder block with a sweeping highlight; static under prefers-reduced-motion. */
export function ShimmerSkeleton({ className, tone = 'light', ...props }: ShimmerSkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        'relative overflow-hidden rounded-md',
        'before:absolute before:inset-0 before:-translate-x-full before:animate-shimmer',
        'before:bg-gradient-to-r before:from-transparent before:to-transparent',
        'motion-reduce:before:hidden',
        toneClasses[tone],
        className,
      )}
      {...props}
    />
  );
}

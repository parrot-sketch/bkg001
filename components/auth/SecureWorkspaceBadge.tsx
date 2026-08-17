'use client';

interface SecureWorkspaceBadgeProps {
  provider?: string;
}

export function SecureWorkspaceBadge({
  provider = 'BKG Consulting Africa',
}: SecureWorkspaceBadgeProps) {
  return (
    <div>
      <div className="flex items-center gap-2 text-[12px] text-[#718096]">
        <svg
          viewBox="0 0 20 20"
          fill="currentColor"
          className="h-3.5 w-3.5 shrink-0 text-[#102F52]"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M9.661 2.237a.531.531 0 01.678 0 11.947 11.947 0 007.078 2.749.5.5 0 01.479.425c.069.52.104 1.05.104 1.59 0 5.162-3.26 9.563-7.834 11.256a.48.48 0 01-.332 0C5.26 16.564 2 12.163 2 7c0-.538.035-1.069.104-1.589a.5.5 0 01.48-.425 11.947 11.947 0 007.077-2.75zm4.196 5.954a.75.75 0 00-1.114-1.004l-3.362 3.73-1.36-1.412a.75.75 0 10-1.08 1.04l1.91 1.984a.75.75 0 001.097-.018l3.91-4.32z"
            clipRule="evenodd"
          />
        </svg>

        <span>Secure clinical workspace</span>
      </div>

      <p className="mt-2 text-[11px] text-[#9AA4B2]">
        Tibaflow · {provider}
      </p>
    </div>
  );
}
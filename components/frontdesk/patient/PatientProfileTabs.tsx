'use client';

import { useState, type ReactNode } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { cn } from '@/lib/utils';

export type PatientProfileTab = 'overview' | 'visits' | 'billing';

interface PatientProfileTabsProps {
  defaultTab: PatientProfileTab;
  visitCount: number;
  overview: ReactNode;
  visits: ReactNode;
  billing: ReactNode;
}

/**
 * Keeps the three concerns of the profile separate: who the patient is,
 * what visits they've had, and what they owe. The active tab is mirrored to
 * `?tab=` so a refresh or shared link lands on the same view.
 */
export function PatientProfileTabs({ defaultTab, visitCount, overview, visits, billing }: PatientProfileTabsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [active, setActive] = useState<PatientProfileTab>(defaultTab);

  const select = (tab: PatientProfileTab) => {
    setActive(tab);
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', tab);
    if (tab !== 'visits') params.delete('visitDate');
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const tabs: { id: PatientProfileTab; label: string; count?: number }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'visits', label: 'Visits', count: visitCount },
    { id: 'billing', label: 'Billing' },
  ];

  return (
    <div className="space-y-4">
      <div
        role="tablist"
        aria-label="Patient record sections"
        className="flex gap-1 rounded-xl border border-[#e7d6bf] bg-white/95 p-1 backdrop-blur"
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            type="button"
            aria-selected={active === tab.id}
            onClick={() => select(tab.id)}
            className={cn(
              'flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors sm:flex-none sm:px-5',
              active === tab.id
                ? 'bg-[#2c2e4b] text-white shadow-sm'
                : 'text-[#2c2e4b]/70 hover:bg-[#e7d6bf]/30 hover:text-[#2c2e4b]',
            )}
          >
            {tab.label}
            {typeof tab.count === 'number' && (
              <span
                className={cn(
                  'rounded-full px-1.5 text-[11px] tabular-nums',
                  active === tab.id ? 'bg-white/15 text-white' : 'bg-[#e7d6bf]/50 text-[#2c2e4b]/70',
                )}
              >
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      <div role="tabpanel">
        {active === 'overview' && overview}
        {active === 'visits' && visits}
        {active === 'billing' && billing}
      </div>
    </div>
  );
}

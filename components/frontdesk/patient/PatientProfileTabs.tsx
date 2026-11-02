'use client';

import { useState, type ReactNode } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { cn } from '@/lib/utils';

export type PatientProfileTab = 'overview' | 'visits' | 'charges' | 'billing';

interface PatientProfileTabsProps {
  defaultTab: PatientProfileTab;
  visitCount: number;
  overview: ReactNode;
  visits: ReactNode;
  charges: ReactNode;
  billing: ReactNode;
}

/**
 * Keeps the three concerns of the profile separate: who the patient is,
 * what visits they've had, and what they owe. The active tab is mirrored to
 * `?tab=` so a refresh or shared link lands on the same view.
 */
export function PatientProfileTabs({ defaultTab, visitCount, overview, visits, charges, billing }: PatientProfileTabsProps) {
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
    { id: 'charges', label: 'Charge sheet' },
    { id: 'billing', label: 'Billing' },
  ];

  return (
    <div>
      <div
        role="tablist"
        aria-label="Patient record sections"
        className="flex border-b border-[#e7d6bf]"
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            type="button"
            aria-selected={active === tab.id}
            onClick={() => select(tab.id)}
            className={cn(
              'flex items-center justify-center gap-2 border-b-2 px-5 py-3 text-sm font-medium transition-colors',
              active === tab.id
                ? 'border-[#2c2e4b] bg-[#e7d6bf]/30 text-[#2c2e4b]'
                : 'border-transparent text-[#2c2e4b]/60 hover:bg-[#e7d6bf]/30 hover:text-[#2c2e4b]',
            )}
          >
            {tab.label}
            {typeof tab.count === 'number' && (
              <span className="font-mono text-[11px] tabular-nums text-[#005f73]">{tab.count}</span>
            )}
          </button>
        ))}
      </div>

      <div role="tabpanel">
        {active === 'overview' && overview}
        {active === 'visits' && visits}
        {active === 'charges' && charges}
        {active === 'billing' && billing}
      </div>
    </div>
  );
}

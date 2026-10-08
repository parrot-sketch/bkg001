import { ReactNode } from 'react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Patient Intake | Nairobi Sculpt',
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
};

/**
 * Isolated Layout for standalone intake pages.
 * Ensures NO sidebars, NO absolute-positioned menus, and NO global navigation.
 * The document itself scrolls; this wrapper must not become a scroll container.
 */
export default function IntakeLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-[100dvh] bg-[#f7f4ef] overflow-x-clip touch-manipulation">
      {children}
    </div>
  );
}

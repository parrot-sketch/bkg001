import { ReactNode } from 'react';

/**
 * Isolated Layout for standalone intake pages.
 * Ensures NO sidebars, NO absolute-positioned menus, and NO global navigation.
 * Mobile-optimized with proper scrolling support.
 */
export default function IntakeLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-white overflow-y-auto overflow-x-hidden touch-manipulation">
      {children}
    </div>
  );
}

import { ReactNode } from 'react';

/**
 * Isolated Layout for standalone intake pages.
 * Ensures NO sidebars, NO absolute-positioned menus, and NO global navigation.
 */
export default function IntakeLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-white">
      {children}
    </div>
  );
}

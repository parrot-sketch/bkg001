/**
 * Frontdesk Dashboard Layout
 * 
 * Main layout for all frontdesk dashboard pages.
 * Includes sidebar navigation and content area.
 */

import { FrontdeskSidebar } from '../../components/frontdesk/FrontdeskSidebar';
import { ReactNode } from 'react';

interface FrontdeskLayoutProps {
  children: ReactNode;
}

export default function FrontdeskLayout({ children }: FrontdeskLayoutProps) {
  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <FrontdeskSidebar />

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="container mx-auto px-4 py-8 lg:px-8">
          {children}
        </div>
      </main>
    </div>
  );
}

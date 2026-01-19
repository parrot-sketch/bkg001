/**
 * Nurse Dashboard Layout
 * 
 * Main layout for all nurse dashboard pages.
 * Includes sidebar navigation and content area.
 */

import { NurseSidebar } from '../../components/nurse/NurseSidebar';
import { ReactNode } from 'react';

interface NurseLayoutProps {
  children: ReactNode;
}

export default function NurseLayout({ children }: NurseLayoutProps) {
  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <NurseSidebar />

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="container mx-auto px-4 py-8 lg:px-8">
          {children}
        </div>
      </main>
    </div>
  );
}

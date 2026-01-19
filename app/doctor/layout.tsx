/**
 * Doctor Dashboard Layout
 * 
 * Main layout for all doctor dashboard pages.
 * Includes sidebar navigation and content area.
 */

import { DoctorSidebar } from '@/components/doctor/DoctorSidebar';
import { ReactNode } from 'react';

interface DoctorLayoutProps {
  children: ReactNode;
}

export default function DoctorLayout({ children }: DoctorLayoutProps) {
  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <DoctorSidebar />

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="container mx-auto px-4 py-8 lg:px-8">
          {children}
        </div>
      </main>
    </div>
  );
}

'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface ConsultationRoomLayoutProps {
  header: ReactNode;
  patientPanel: ReactNode;
  workspace: ReactNode;
  queuePanel: ReactNode;
  sidebarOpen: boolean;
  queuePanelOpen: boolean;
  onToggleSidebar: () => void;
  onToggleQueuePanel: () => void;
}

export function ConsultationRoomLayout({
  header,
  patientPanel,
  workspace,
  queuePanel,
  sidebarOpen,
  queuePanelOpen,
  onToggleSidebar,
  onToggleQueuePanel,
}: ConsultationRoomLayoutProps) {
  return (
    <div className="flex h-full min-h-0 flex-1 flex-col bg-white text-[#2c2e4b]">
      {header}

      <div className="relative flex min-h-0 flex-1 overflow-hidden">
        {sidebarOpen && (
          <button
            type="button"
            aria-label="Close patient details"
            className="absolute inset-0 z-20 bg-[#2c2e4b]/40 lg:hidden"
            onClick={onToggleSidebar}
          />
        )}
        {queuePanelOpen && (
          <button
            type="button"
            aria-label="Close queue"
            className="absolute inset-0 z-20 bg-[#2c2e4b]/40 xl:hidden"
            onClick={onToggleQueuePanel}
          />
        )}

        <aside
          className={cn(
            'flex min-h-0 flex-col overflow-hidden bg-white',
            'absolute inset-y-0 left-0 z-30 w-[min(100%,22rem)] border-r border-[#e7d6bf] shadow-xl transition-transform',
            'lg:static lg:z-auto lg:shadow-none lg:transition-[width]',
            sidebarOpen
              ? 'translate-x-0 lg:w-[280px]'
              : '-translate-x-full lg:w-0 lg:translate-x-0 lg:border-r-0',
          )}
        >
          <div className="h-full min-h-0 w-[min(100%,22rem)] lg:w-[280px]">{patientPanel}</div>
        </aside>

        <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">{workspace}</main>

        <aside
          className={cn(
            'flex min-h-0 flex-col overflow-hidden bg-white',
            'absolute inset-y-0 right-0 z-30 w-[min(100%,22rem)] border-l border-[#e7d6bf] shadow-xl transition-transform',
            'xl:static xl:z-auto xl:shadow-none xl:transition-[width]',
            queuePanelOpen
              ? 'translate-x-0 xl:w-[300px]'
              : 'translate-x-full xl:w-0 xl:translate-x-0 xl:border-l-0',
          )}
        >
          <div className="h-full min-h-0 w-[min(100%,22rem)] xl:w-[300px]">{queuePanel}</div>
        </aside>
      </div>
    </div>
  );
}

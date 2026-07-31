'use client';

import type { ReactNode } from 'react';

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
    <div className="flex flex-col h-[100dvh] bg-[#fcfbf8] text-[#2c2e4b]">
      {header}

      <div className="flex-1 flex overflow-hidden">
        <aside
          className={`
            shrink-0 hidden lg:flex flex-col bg-white overflow-hidden
            transition-[width] duration-200 ease-out
            ${sidebarOpen ? 'w-[280px] border-r border-[#e7d6bf] shadow-[4px_0_24px_-8px_rgba(44,46,75,0.06)]' : 'w-0 border-r-0'}
          `}
        >
          {sidebarOpen && patientPanel}
        </aside>

        <main className="flex-1 flex flex-col overflow-hidden">
          {workspace}
        </main>

        <aside
          className={`
            shrink-0 hidden xl:flex flex-col bg-white overflow-hidden
            transition-[width] duration-200 ease-out
            ${queuePanelOpen ? 'w-[300px] border-l border-[#e7d6bf] shadow-[-4px_0_24px_-8px_rgba(44,46,75,0.06)]' : 'w-0 border-l-0'}
          `}
        >
          {queuePanelOpen && queuePanel}
        </aside>
      </div>
    </div>
  );
}

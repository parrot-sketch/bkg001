'use client';

import { Suspense } from 'react';
import dynamic from 'next/dynamic';

const ConsultationWorkspaceOptimized = dynamic(
  () => import('@/components/consultation/ConsultationWorkspaceOptimized').then(mod => ({
    default: mod.ConsultationWorkspaceOptimized,
  })),
  {
    loading: () => <WorkspaceSkeleton />,
    ssr: false,
  }
);

function WorkspaceSkeleton() {
  return (
    <div className="flex-1 flex flex-col">
      <div className="h-14 border-b border-[#e7d6bf] bg-white flex items-center px-3 gap-2">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="h-9 flex-1 rounded-lg bg-[#e7d6bf]/50 animate-pulse" />
        ))}
      </div>
      <div className="flex-1 p-6 space-y-4">
        <div className="h-5 w-36 bg-[#e7d6bf]/50 rounded animate-pulse" />
        <div className="h-3 w-64 bg-[#e7d6bf]/50 rounded animate-pulse" />
        <div className="h-72 w-full rounded-xl bg-[#e7d6bf]/50 animate-pulse" />
      </div>
      <div className="h-16 border-t border-[#e7d6bf] flex items-center justify-between px-6">
        <div className="h-9 w-24 rounded-lg bg-[#e7d6bf]/50 animate-pulse" />
        <div className="h-4 w-16 bg-[#e7d6bf]/50 rounded animate-pulse" />
        <div className="h-9 w-24 rounded-lg bg-[#e7d6bf]/50 animate-pulse" />
      </div>
    </div>
  );
}

export function ConsultationWorkspace() {
  return <ConsultationWorkspaceOptimized />;
}

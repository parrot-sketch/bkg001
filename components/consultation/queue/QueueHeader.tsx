'use client';

import { RefreshCw, ChevronRight } from 'lucide-react';

interface QueueHeaderProps {
  queueCount: number;
  onCollapse: () => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export function QueueHeader({ queueCount, onCollapse, onRefresh, isRefreshing }: QueueHeaderProps) {
  return (
    <div className="px-4 py-3 border-b border-[#e7d6bf] bg-[#e7d6bf]/30 flex items-center justify-between">
      <div className="flex flex-col min-w-0">
        <span className="text-sm font-semibold text-[#2c2e4b]">Queue</span>
        <span className="text-xs text-[#2c2e4b]/60">
          {queueCount} waiting
        </span>
      </div>
      <div className="flex items-center gap-1">
        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="h-8 w-8 flex items-center justify-center text-[#2c2e4b]/50 hover:text-[#2c2e4b] hover:bg-[#e7d6bf]/50 transition-colors disabled:opacity-50"
            title="Refresh queue"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        )}
        <button
          onClick={onCollapse}
          className="h-8 w-8 flex items-center justify-center text-[#2c2e4b]/50 hover:text-[#2c2e4b] hover:bg-[#e7d6bf]/50 transition-colors"
          title="Collapse queue"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

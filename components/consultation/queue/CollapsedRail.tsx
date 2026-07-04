'use client';

import { motion } from 'framer-motion';
import { ChevronLeft } from 'lucide-react';

interface CollapsedRailProps {
  queueCount: number;
  onClick: () => void;
}

export function CollapsedRail({ queueCount, onClick }: CollapsedRailProps) {
  return (
    <motion.div
      layoutId="queue-panel"
      className="relative hidden lg:block z-30"
    >
      <button
        onClick={onClick}
        className="h-full w-12 border-l border-[#e7d6bf] bg-[#2c2e4b] flex flex-col items-center justify-start pt-6 gap-3 hover:bg-[#1a1c2f] transition-colors"
      >
        <motion.div whileTap={{ scale: 0.95 }}>
          <ChevronLeft className="h-4 w-4 text-[#caa26a]" />
        </motion.div>

        <div className="text-xs font-semibold text-[#caa26a] tabular-nums">{queueCount}</div>

        <span className="text-[10px] text-[#e7d6bf] font-bold uppercase tracking-[0.2em] [writing-mode:vertical-lr] mt-4 opacity-80">
          QUEUE
        </span>
      </button>
    </motion.div>
  );
}

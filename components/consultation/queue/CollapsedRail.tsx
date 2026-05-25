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
        className="h-full w-12 border-l border-slate-200 bg-white flex flex-col items-center justify-start pt-6 gap-3 hover:bg-slate-50 transition-colors"
      >
        <motion.div whileTap={{ scale: 0.95 }}>
          <ChevronLeft className="h-4 w-4 text-slate-400" />
        </motion.div>

        <div className="text-xs font-semibold text-slate-700 tabular-nums">{queueCount}</div>

        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] [writing-mode:vertical-lr] mt-4 opacity-70">
          QUEUE
        </span>
      </button>
    </motion.div>
  );
}

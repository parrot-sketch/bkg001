'use client';

import { motion } from 'framer-motion';
import { Users, ChevronRight } from 'lucide-react';

interface QueueHeaderProps {
  queueCount: number;
  onCollapse: () => void;
}

export function QueueHeader({ queueCount, onCollapse }: QueueHeaderProps) {
  return (
    <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="h-8 w-8 rounded-lg bg-emerald-100 flex items-center justify-center">
          <Users className="h-4 w-4 text-emerald-600" />
        </div>
        <div className="flex flex-col">
          <span className="font-bold text-[13px] text-slate-900 tracking-tight">Active Queue</span>
          <span className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">
            {queueCount} Patients Waiting
          </span>
        </div>
      </div>
      <motion.button
        whileHover={{ x: 2, scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={onCollapse}
        className="h-8 w-8 flex items-center justify-center text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
      >
        <ChevronRight className="h-4 w-4" />
      </motion.button>
    </div>
  );
}

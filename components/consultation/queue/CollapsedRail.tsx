'use client';

import { motion } from 'framer-motion';
import { Users, ChevronLeft } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

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
        className={cn(
          "h-full w-12 border-l border-slate-200 flex flex-col items-center justify-start pt-6 gap-3 transition-all duration-300 backdrop-blur-xl",
          queueCount > 0
            ? "bg-emerald-50 hover:bg-emerald-100"
            : "bg-white/40 hover:bg-slate-50",
        )}
      >
        <motion.div whileHover={{ scale: 1.2 }} whileTap={{ scale: 0.9 }}>
          <ChevronLeft className="h-4 w-4 text-slate-400" />
        </motion.div>

        <div className="relative group">
          <Users className={cn(
            "h-5 w-5 transition-transform duration-300 group-hover:scale-110",
            queueCount > 0 ? "text-emerald-600" : "text-slate-400",
          )} />
          {queueCount > 0 && (
            <Badge className="absolute -top-1.5 -right-1.5 bg-emerald-600 text-white text-[9px] h-3.5 min-w-[14px] px-1 justify-center border-none shadow-sm">
              {queueCount}
            </Badge>
          )}
        </div>

        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] [writing-mode:vertical-lr] mt-4 opacity-70 group-hover:opacity-100 transition-opacity">
          WAITING QUEUE
        </span>
      </button>
    </motion.div>
  );
}

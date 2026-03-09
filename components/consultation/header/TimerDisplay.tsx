'use client';

import { motion } from 'framer-motion';
import { Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TimerDisplayProps {
  elapsed: string | null;
  timeInfo: any;
  remainingDisplay: string | null;
}

export function TimerDisplay({ elapsed, timeInfo, remainingDisplay }: TimerDisplayProps) {
  if (!elapsed) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-1.5 text-[11px] text-slate-400 font-medium"
    >
      <Clock className="h-3 w-3 text-emerald-500/70" />
      <span className="font-mono tabular-nums tracking-wider">{elapsed}</span>
      
      {timeInfo && (
        <>
          {' • '}
          <div
            className={cn(
              'flex items-center gap-1 px-2 py-0.5 rounded-md font-mono tabular-nums',
              timeInfo.isOverrun
                ? 'bg-red-50 text-red-600 font-bold'
                : timeInfo.isWarning
                  ? 'bg-amber-50 text-amber-600 font-bold'
                  : 'text-slate-500'
            )}
          >
            {remainingDisplay}
          </div>
          
          <div className="w-12 h-1.5 bg-slate-200 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{
                width: `${Math.min(100, timeInfo.percentUsed)}%`,
              }}
              className={cn(
                'h-full transition-colors',
                timeInfo.isOverrun ? 'bg-red-500' : timeInfo.isWarning ? 'bg-amber-500' : 'bg-emerald-500'
              )}
            />
          </div>
        </>
      )}
    </motion.div>
  );
}

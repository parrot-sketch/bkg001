'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface PatientAvatarProps {
  initials: string;
  isActive: boolean;
  isCompleted: boolean;
}

export function PatientAvatar({ initials, isActive, isCompleted }: PatientAvatarProps) {
  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className={cn(
        'h-10 w-10 rounded-xl flex items-center justify-center shrink-0 font-bold text-sm shadow-sm transition-all duration-300',
        isActive
          ? 'bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200'
          : isCompleted
            ? 'bg-slate-100 text-slate-500'
            : 'bg-indigo-50 text-indigo-600 ring-1 ring-indigo-200'
      )}
    >
      {initials}
    </motion.div>
  );
}

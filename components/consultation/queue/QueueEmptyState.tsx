'use client';

import { motion } from 'framer-motion';
import { UserCheck } from 'lucide-react';

export function QueueEmptyState() {
  return (
    <div className="py-12 px-6 text-center">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="h-16 w-16 bg-slate-100 rounded-3xl flex items-center justify-center mx-auto mb-4 border border-slate-200 shadow-sm"
      >
        <UserCheck className="h-8 w-8 text-slate-400" />
      </motion.div>
      <p className="text-sm text-slate-900 font-bold tracking-tight">Queue Clear</p>
      <p className="text-[11px] text-slate-500 mt-1 uppercase tracking-wider font-medium">
        All patients attended
      </p>
    </div>
  );
}

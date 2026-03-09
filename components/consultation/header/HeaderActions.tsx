'use client';

import { motion } from 'framer-motion';
import { Save, CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface HeaderActionsProps {
  isActive: boolean;
  isCompleted: boolean;
  isSaving: boolean;
  canComplete: boolean;
  onSave: () => void;
  onComplete: () => void;
}

export function HeaderActions({ 
  isActive, 
  isCompleted, 
  isSaving, 
  canComplete, 
  onSave, 
  onComplete 
}: HeaderActionsProps) {
  if (isCompleted) {
    return (
      <Badge
        variant="outline"
        className="bg-emerald-50 text-emerald-600 border-emerald-100 gap-1.5 py-1.5 px-3 font-bold"
      >
        <CheckCircle2 className="h-3.5 w-3.5" />
        CONCLUDED
      </Badge>
    );
  }

  if (!isActive) return null;

  return (
    <>
      <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
        <Button
          variant="outline"
          size="sm"
          onClick={onSave}
          disabled={isSaving}
          className="h-9 gap-2 text-slate-600 border-slate-200 bg-white hover:bg-slate-50 hover:text-indigo-600 font-medium shadow-sm transition-all"
        >
          {isSaving ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-500" />
          ) : (
            <Save className="h-3.5 w-3.5 opacity-70" />
          )}
          <span className="hidden sm:inline">Save Draft</span>
        </Button>
      </motion.div>

      {canComplete && (
        <motion.div whileHover={{ scale: 1.02, y: -1 }} whileTap={{ scale: 0.98 }}>
          <Button
            onClick={onComplete}
            size="sm"
            className="h-9 gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-4 shadow-sm transition-all border-none"
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Complete Session</span>
          </Button>
        </motion.div>
      )}
    </>
  );
}

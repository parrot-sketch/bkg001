'use client';

import { cn } from '@/lib/utils';

interface ConsultationDividerProps {
  className?: string;
  margin?: 'sm' | 'md' | 'lg' | 'none';
}

export function ConsultationDivider({ 
  className, 
  margin = 'md' 
}: ConsultationDividerProps) {
  const margins = {
    sm: 'mx-2',
    md: 'mx-5',
    lg: 'mx-8',
    none: 'mx-0'
  };

  return (
    <div className={cn(margins[margin], "h-px bg-slate-100", className)} />
  );
}

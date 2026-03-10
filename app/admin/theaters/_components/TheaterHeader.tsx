'use client';

import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface TheaterHeaderProps {
  onAdd: () => void;
}

export function TheaterHeader({ onAdd }: TheaterHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Operating Theaters
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Configure and manage surgical suites, procedure rooms, and scheduling infrastructure.
        </p>
      </div>
      <Button 
        onClick={onAdd} 
        className="gap-2 shrink-0 bg-slate-900 group rounded-xl shadow-lg shadow-slate-900/10 hover:shadow-slate-900/20 transition-all active:scale-[0.98]"
      >
        <Plus className="h-4 w-4 transition-transform group-hover:rotate-90" />
        Add Theater
      </Button>
    </div>
  );
}

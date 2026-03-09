'use client';

import { LucideIcon } from 'lucide-react';

interface ConsultationSectionProps {
  icon: LucideIcon;
  title: string;
  children: React.ReactNode;
  className?: string;
}

export function ConsultationSection({
  icon: Icon,
  title,
  children,
  className,
}: ConsultationSectionProps) {
  return (
    <div className={className || "px-5 py-5"}>
      <div className="flex items-center gap-2 mb-4">
        <div className="h-7 w-7 rounded-lg bg-indigo-50 flex items-center justify-center border border-indigo-100 shadow-sm">
          <Icon className="h-3.5 w-3.5 text-indigo-600" />
        </div>
        <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">
          {title}
        </h3>
      </div>
      {children}
    </div>
  );
}

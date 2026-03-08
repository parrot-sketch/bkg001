'use client';

import { 
  Shield, 
  CheckCircle2, 
  Circle 
} from 'lucide-react';
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

export interface ChecklistItem {
    key: string;
    label: string;
    shortLabel: string;
    done: boolean;
}

interface SafetyProgressStripProps {
    checklist: ChecklistItem[];
}

export function SafetyProgressStrip({ checklist }: SafetyProgressStripProps) {
    const completedCount = checklist.filter(c => c.done).length;
    const progressPct = Math.round((completedCount / checklist.length) * 100);

    return (
        <div className="border-t px-4 sm:px-5 py-3 bg-muted/30">
            <TooltipProvider delayDuration={100}>
                <div className="flex items-center gap-3">
                    <Shield className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">
                        {completedCount}/{checklist.length}
                    </span>

                    <div className="flex items-center gap-1.5 flex-1">
                        {checklist.map((item) => (
                            <Tooltip key={item.key}>
                                <TooltipTrigger asChild>
                                    <button
                                        type="button"
                                        className={cn(
                                            "flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-medium transition-colors",
                                            item.done
                                                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400"
                                                : "bg-muted text-muted-foreground"
                                        )}
                                    >
                                        {item.done ? (
                                            <CheckCircle2 className="h-3 w-3" />
                                        ) : (
                                            <Circle className="h-3 w-3" />
                                        )}
                                        <span className="hidden md:inline">{item.shortLabel}</span>
                                    </button>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>{item.label}</p>
                                </TooltipContent>
                            </Tooltip>
                        ))}
                    </div>

                    <div className="hidden sm:flex items-center gap-2 ml-auto shrink-0">
                        <div className="w-20 h-1.5 rounded-full bg-muted overflow-hidden">
                            <div
                                className={cn(
                                    "h-full rounded-full transition-all duration-500",
                                    progressPct === 100 ? "bg-emerald-500" : "bg-primary"
                                )}
                                style={{ width: `${progressPct}%` }}
                            />
                        </div>
                        <span className="text-[11px] font-medium text-muted-foreground">
                            {progressPct}%
                        </span>
                    </div>
                </div>
            </TooltipProvider>
        </div>
    );
}

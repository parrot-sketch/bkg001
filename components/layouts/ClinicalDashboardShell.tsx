'use client';

/**
 * Clinical Dashboard Shell
 * 
 * A reusable container component that standardizes spacing, responsiveness,
 * and visual hierarchy across all clinical role dashboards.
 * 
 * REFINED: Smoother scrolling, refined padding, and elegant transitions.
 */

import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface ClinicalDashboardShellProps {
    children: ReactNode;
    className?: string;
}

export function ClinicalDashboardShell({ children, className }: ClinicalDashboardShellProps) {
    return (
        <main className={cn(
            "flex-1 overflow-y-auto overscroll-contain",
            "bg-gradient-to-b from-slate-50/80 via-white to-slate-50/40",
            "scroll-smooth"
        )}>
            <div className="w-full min-h-full">
                <div className={cn(
                    "mx-auto w-full max-w-[1600px]",
                    // Refined padding - tighter on mobile, comfortable on desktop
                    "px-4 py-5 sm:px-5 sm:py-6 lg:px-8 lg:py-7 xl:px-10 xl:py-8",
                    className
                )}>
                    {children}
                </div>
            </div>
        </main>
    );
}

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
    variant?: 'default' | 'immersive';
}

export function ClinicalDashboardShell({
    children,
    className,
    variant = 'default'
}: ClinicalDashboardShellProps) {
    const isImmersive = variant === 'immersive';

    return (
        <main className={cn(
            "flex-1 relative overflow-hidden focus:outline-none h-full",
            !isImmersive && "bg-gradient-to-b from-slate-50/80 via-white to-slate-50/40 overflow-y-auto overscroll-contain scroll-smooth",
            isImmersive && "bg-transparent",
        )}>
            <div className={cn(
                "w-full h-full",
                !isImmersive && "min-h-full"
            )}>
                <div className={cn(
                    "w-full",
                    !isImmersive && "mx-auto max-w-[1600px] px-4 py-5 sm:px-5 sm:py-6 lg:px-8 lg:py-7 xl:px-10 xl:py-8",
                    isImmersive && "h-full",
                    className
                )}>
                    {children}
                </div>
            </div>
        </main>
    );
}

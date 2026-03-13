'use client';

/**
 * Clinical Dashboard Shell
 * 
 * A reusable container component that standardizes spacing, responsiveness,
 * and visual hierarchy across all clinical role dashboards.
 * 
 * REFINED: Added mobile menu button accommodation - accounts for fixed menu on mobile.
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
                    !isImmersive && "min-h-full",
                    // Account for mobile menu button: add top padding on mobile
                    // The button is fixed at top-4 left-4, so we need to avoid content overlap
                    !isImmersive && "mx-auto max-w-[1600px] px-4 sm:px-5 py-5 sm:py-6 lg:px-8 lg:py-7 xl:px-10 xl:py-8 pb-8 sm:pb-10 pt-14 sm:pt-16 lg:pt-0",
                    isImmersive && "h-full",
                    className
                )}>
                    {children}
                </div>
            </div>
        </main>
    );
}

'use client';

/**
 * Clinical Dashboard Shell
 * 
 * A reusable container component that standardizes spacing, responsiveness,
 * and visual hierarchy across all clinical role dashboards.
 * 
 * Follows React best practices for composition and separation of concerns.
 */

import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface ClinicalDashboardShellProps {
    children: ReactNode;
    className?: string;
}

export function ClinicalDashboardShell({ children, className }: ClinicalDashboardShellProps) {
    return (
        <main className="flex-1 overflow-y-auto bg-slate-50/10">
            <div className="w-full min-h-full">
                <div className={cn(
                    "mx-auto w-full max-w-[1920px]",
                    "px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8 xl:px-10 xl:py-10 2xl:px-12 2xl:py-12",
                    className
                )}>
                    {children}
                </div>
            </div>
        </main>
    );
}

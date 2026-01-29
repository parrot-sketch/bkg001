/**
 * QuickActionCard Component
 * 
 * Pure UI component for displaying dashboard quick actions.
 * No business logic, no data fetching - just presentation.
 * 
 * Features:
 * - Memoized for performance
 * - Accessible
 * - Responsive
 * - Loading state support
 */

import React from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { ChevronRight, Loader2 } from 'lucide-react';
import { QuickActionCardProps } from '@/types/dashboard';
import { cn } from '@/lib/utils';

const colorStyles = {
    blue: {
        border: 'border-l-blue-500',
        bg: 'bg-blue-100 dark:bg-blue-900/30',
        text: 'text-blue-600',
        icon: 'text-blue-600',
    },
    amber: {
        border: 'border-l-amber-500',
        bg: 'bg-amber-100 dark:bg-amber-900/30',
        text: 'text-amber-600',
        icon: 'text-amber-600',
    },
    green: {
        border: 'border-l-green-500',
        bg: 'bg-green-100 dark:bg-green-900/30',
        text: 'text-green-600',
        icon: 'text-green-600',
    },
    cyan: {
        border: 'border-l-cyan-500',
        bg: 'bg-cyan-100 dark:bg-cyan-900/30 from-cyan-50 to-cyan-50/50',
        text: 'text-cyan-600',
        icon: 'text-cyan-600',
    },
    indigo: {
        border: 'border-l-indigo-500',
        bg: 'bg-indigo-100 dark:bg-indigo-900/30',
        text: 'text-indigo-600',
        icon: 'text-indigo-600',
    },
};

export const QuickActionCard = React.memo<QuickActionCardProps>(({
    title,
    count,
    icon: Icon,
    color,
    href,
    description,
    loading = false,
    actionText = 'View',
}) => {
    const styles = colorStyles[color];

    return (
        <Link
            href={href}
            className="flex-1 min-w-[280px] block"
        >
            <Card className={cn(
                'cursor-pointer hover:shadow-md transition-shadow border-l-4 h-full',
                styles.border
            )}>
                <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                        <div className="flex-1">
                            <p className="text-sm font-medium text-muted-foreground mb-1">
                                {title}
                            </p>

                            {count !== undefined && (
                                <div className="flex items-baseline gap-2">
                                    {loading ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <>
                                            <span className={cn('text-3xl font-bold', styles.text)}>
                                                {count}
                                            </span>
                                            {description && (
                                                <span className="text-xs text-muted-foreground">
                                                    {description}
                                                </span>
                                            )}
                                        </>
                                    )}
                                </div>
                            )}

                            {description && count === undefined && (
                                <p className="text-xs text-gray-500 mt-2">{description}</p>
                            )}
                        </div>

                        <div className={cn('p-2.5 rounded-lg', styles.bg)}>
                            <Icon className={cn('h-5 w-5', styles.icon)} />
                        </div>
                    </div>

                    <div className={cn('mt-4 flex items-center text-xs font-medium', styles.text)}>
                        {actionText}
                        <ChevronRight className="h-3 w-3 ml-1" />
                    </div>
                </CardContent>
            </Card>
        </Link>
    );
});

QuickActionCard.displayName = 'QuickActionCard';

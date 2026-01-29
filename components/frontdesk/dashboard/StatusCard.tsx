/**
 * StatusCard Component
 * 
 * Pure UI component for displaying dashboard statistics.
 * Memoized for optimal performance.
 */

import React from 'react';
import { StatusCardProps } from '@/types/dashboard';
import { cn } from '@/lib/utils';

const colorStyles = {
    blue: {
        bg: 'bg-blue-100 dark:bg-blue-900/20',
        icon: 'text-blue-600 dark:text-blue-400',
    },
    amber: {
        bg: 'bg-amber-100 dark:bg-amber-900/20',
        icon: 'text-amber-600 dark:text-amber-400',
    },
    green: {
        bg: 'bg-green-100 dark:bg-green-900/20',
        icon: 'text-green-600 dark:text-green-400',
    },
    cyan: {
        bg: 'bg-cyan-100 dark:bg-cyan-900/20',
        icon: 'text-cyan-600 dark:text-cyan-400',
    },
    indigo: {
        bg: 'bg-indigo-100 dark:bg-indigo-900/20',
        icon: 'text-indigo-600 dark:text-indigo-400',
    },
};

export const StatusCard = React.memo<StatusCardProps>(({
    label,
    value,
    icon: Icon,
    color,
}) => {
    const styles = colorStyles[color];

    return (
        <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border border-border/50">
            <div className={cn('p-2 rounded-lg flex-shrink-0', styles.bg)}>
                <Icon className={cn('h-4 w-4', styles.icon)} />
            </div>
            <div className="min-w-0">
                <p className="text-xs text-muted-foreground font-medium">{label}</p>
                <p className="text-xl font-bold">{value}</p>
            </div>
        </div>
    );
});

StatusCard.displayName = 'StatusCard';

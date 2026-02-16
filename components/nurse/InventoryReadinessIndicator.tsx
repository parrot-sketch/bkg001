'use client';

import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { Package, AlertTriangle, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

import { InventoryStatusResponse } from '@/lib/api/nurse';

interface InventoryReadinessIndicatorProps {
    status: InventoryStatusResponse | undefined;
    isLoading: boolean;
    className?: string;
}

export function InventoryReadinessIndicator({
    status,
    isLoading,
    className
}: InventoryReadinessIndicatorProps) {
    // 1. Loading State
    if (isLoading) {
        return (
            <div className={cn("inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-slate-50 border border-slate-100 text-slate-400 text-[10px] font-medium animate-pulse", className)}>
                <Loader2 className="h-3 w-3 animate-spin" />
                <span>Checking Stock...</span>
            </div>
        );
    }

    // 2. Not Required
    if (!status || status.status === 'NOT_REQUIRED') {
        return null; // Or return a "N/A" badge if preferred, but usually cleaner to hide
    }

    // 3. Status Configuration
    const config = {
        AVAILABLE: {
            label: 'In Stock',
            icon: CheckCircle2,
            colors: 'bg-emerald-50 text-emerald-700 border-emerald-200',
            iconColor: 'text-emerald-600'
        },
        OUT_OF_STOCK: {
            label: 'Out of Stock',
            icon: AlertCircle,
            colors: 'bg-rose-50 text-rose-700 border-rose-200',
            iconColor: 'text-rose-600'
        },
        UNKNOWN: {
            label: 'Check Stock',
            icon: AlertTriangle,
            colors: 'bg-amber-50 text-amber-700 border-amber-200',
            iconColor: 'text-amber-600'
        },
        UNAVAILABLE: {
            label: 'Unavailable',
            icon: AlertCircle,
            colors: 'bg-slate-100 text-slate-600 border-slate-200',
            iconColor: 'text-slate-500'
        }
    };

    const currentConfig = config[status.status as keyof typeof config] || config.UNKNOWN;
    const Icon = currentConfig.icon;

    return (
        <TooltipProvider>
            <Tooltip delayDuration={300}>
                <TooltipTrigger asChild>
                    <div className={cn(
                        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[10px] font-medium cursor-help transition-colors",
                        currentConfig.colors,
                        className
                    )}>
                        <Icon className={cn("h-3 w-3", currentConfig.iconColor)} />
                        {currentConfig.label}
                    </div>
                </TooltipTrigger>
                <TooltipContent className="max-w-[280px] p-3" side="bottom" align="start">
                    <div className="space-y-3">
                        {/* Header */}
                        <div className="border-b pb-2">
                            <h4 className="font-semibold text-xs flex items-center gap-2">
                                <Package className="h-3.5 w-3.5" />
                                Inventory Status
                            </h4>
                        </div>

                        {/* Request Details */}
                        <div className="space-y-1">
                            <span className="text-[10px] uppercase text-slate-500 font-semibold tracking-wider">Requested Item</span>
                            <div className="text-xs font-medium text-slate-900 bg-slate-50 p-1.5 rounded border border-slate-100">
                                {typeof status.required === 'object' && status.required !== null && status.required.items ? (
                                    <div className="space-y-2">
                                        <ul className="space-y-1">
                                            {status.required.items.map((item: any, idx: number) => (
                                                <li key={idx} className="flex flex-col gap-0.5 border-b border-slate-100 last:border-0 pb-1 last:pb-0">
                                                    <span className="font-medium text-emerald-700">{item.name}</span>
                                                    <div className="flex gap-2 text-[10px] text-slate-500">
                                                        <span>{item.size}</span>
                                                        {item.manufacturer && <span>• {item.manufacturer}</span>}
                                                    </div>
                                                </li>
                                            ))}
                                        </ul>
                                        {status.required.freeTextNotes && (
                                            <p className="text-[10px] text-slate-500 italic border-t border-slate-100 pt-1 mt-1">
                                                Note: {status.required.freeTextNotes}
                                            </p>
                                        )}
                                    </div>
                                ) : (
                                    status.required || 'Unspecified'
                                )}
                            </div>
                        </div>

                        {/* Matches */}
                        <div className="space-y-1">
                            <span className="text-[10px] uppercase text-slate-500 font-semibold tracking-wider">
                                {status.matches.length > 0 ? 'Inventory Matches' : 'No Matches Found'}
                            </span>

                            {status.matches.length > 0 ? (
                                <ul className="space-y-1 max-h-[150px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-200">
                                    {status.matches.map(m => (
                                        <li key={m.id} className="text-xs flex items-center justify-between p-1.5 rounded hover:bg-slate-50 border border-transparent hover:border-slate-100">
                                            <span className="truncate mr-2 max-w-[140px]">{m.name}</span>
                                            {m.quantity > 0 ? (
                                                <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200 whitespace-nowrap">
                                                    {m.quantity} Avail
                                                </Badge>
                                            ) : (
                                                <Badge variant="outline" className="text-[10px] bg-rose-50 text-rose-700 border-rose-200 whitespace-nowrap">
                                                    0 Avail
                                                </Badge>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <div className="text-xs text-amber-600 bg-amber-50 p-2 rounded border border-amber-100 flex items-start gap-2">
                                    <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                                    <p>
                                        No exact matches found in inventory system. Please verify manually.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}

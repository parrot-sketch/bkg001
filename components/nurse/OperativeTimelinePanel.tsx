/**
 * OperativeTimelinePanel Component
 *
 * Displays the surgical case timeline with timestamps and durations.
 * Supports both read-only and editable modes based on user role.
 */

'use client';

import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
    TIMELINE_FIELD_ORDER,
    TIMELINE_FIELD_LABELS,
    type TimelineFieldName,
} from '@/domain/helpers/operativeTimeline';
import { useOperativeTimeline, useUpdateOperativeTimeline } from '@/hooks/nurse/useOperativeTimeline';
import { Timer, Clock, AlertTriangle, Pencil, X, Check } from 'lucide-react';

interface OperativeTimelinePanelProps {
    caseId: string;
    userRole: string;
}

export function OperativeTimelinePanel({ caseId, userRole }: OperativeTimelinePanelProps) {
    const [collapsed, setCollapsed] = useState(false);
    const [editingField, setEditingField] = useState<TimelineFieldName | null>(null);
    const [editTime, setEditTime] = useState('');
    
    const { data: timelineData, isLoading, error } = useOperativeTimeline(caseId);
    const updateMutation = useUpdateOperativeTimeline();

    const canEdit = userRole === 'NURSE' || userRole === 'THEATER_TECHNICIAN' || userRole === 'ADMIN';

    const handleSetNow = async (field: TimelineFieldName) => {
        try {
            await updateMutation.mutateAsync({
                caseId,
                timestamps: { [field]: new Date().toISOString() },
            });
        } catch {
            // Error handling is done in the hook
        }
    };

    const handleStartEdit = (field: TimelineFieldName, currentValue: string | null) => {
        if (!canEdit) return;
        
        if (currentValue) {
            try {
                const time = format(parseISO(currentValue), 'HH:mm');
                setEditTime(time);
            } catch {
                setEditTime('');
            }
        } else {
            setEditTime('');
        }
        setEditingField(field);
    };

    const handleSaveEdit = async (field: TimelineFieldName) => {
        if (!editTime) return;

        try {
            const today = new Date().toISOString().split('T')[0];
            const dateTime = `${today}T${editTime}:00.000Z`;
            
            await updateMutation.mutateAsync({
                caseId,
                timestamps: { [field]: dateTime },
            });
            setEditingField(null);
            setEditTime('');
        } catch {
            // Error handling is done in the hook
        }
    };

    const handleCancelEdit = () => {
        setEditingField(null);
        setEditTime('');
    };

    const formatTime = (iso: string | null): string => {
        if (!iso) return '—';
        try {
            return format(parseISO(iso), 'HH:mm');
        } catch {
            return iso;
        }
    };

    if (isLoading) {
        return (
            <Card className="border-cyan-200 bg-cyan-50/30">
                <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                        <Skeleton className="h-4 w-4 rounded" />
                        <Skeleton className="h-4 w-32" />
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (error) {
        return (
            <Card className="border-amber-200 bg-amber-50/30">
                <CardContent className="p-4">
                    <div className="flex items-center gap-2 text-xs text-amber-700">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        <span>Timeline: {error instanceof Error ? error.message : 'Failed to load timeline'}</span>
                    </div>
                </CardContent>
            </Card>
        );
    }

    const timeline = timelineData?.timeline;
    const durations = timelineData?.durations;
    const missingItems = timelineData?.missingItems ?? [];

    return (
        <Card className="border-cyan-200 bg-cyan-50/20">
            <CardContent className="p-4 space-y-3">
                {/* Header */}
                <button
                    onClick={() => setCollapsed(!collapsed)}
                    className="flex items-center justify-between w-full"
                >
                    <div className="flex items-center gap-2">
                        <Timer className="h-4 w-4 text-cyan-600" />
                        <span className="text-sm font-semibold text-slate-800">Operative Timeline</span>
                        {missingItems.length > 0 && (
                            <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-amber-300 text-amber-700 bg-amber-50">
                                {missingItems.length} missing
                            </Badge>
                        )}
                    </div>
                    <span className="text-xs text-muted-foreground">
                        {collapsed ? 'Show' : 'Hide'}
                    </span>
                </button>

                {!collapsed && timeline && (
                    <>
                        {/* Timeline Grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {TIMELINE_FIELD_ORDER.map((field) => {
                                const value = timeline[field];
                                const isEditing = editingField === field;

                                return (
                                    <div
                                        key={field}
                                        className={`rounded-md border px-2.5 py-2 ${
                                            value
                                                ? 'bg-emerald-50/50 border-emerald-200'
                                                : 'bg-white border-slate-200'
                                        }`}
                                    >
                                        <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                                            {TIMELINE_FIELD_LABELS[field]}
                                        </p>
                                        <div className="flex items-center justify-between mt-0.5">
                                            {isEditing ? (
                                                <div className="flex items-center gap-1 flex-1">
                                                    <Input
                                                        type="time"
                                                        value={editTime}
                                                        onChange={(e) => setEditTime(e.target.value)}
                                                        className="h-6 text-xs w-20"
                                                        autoFocus
                                                    />
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-6 w-6"
                                                        onClick={() => handleSaveEdit(field)}
                                                        disabled={updateMutation.isPending}
                                                    >
                                                        <Check className="h-3 w-3 text-emerald-600" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-6 w-6"
                                                        onClick={handleCancelEdit}
                                                    >
                                                        <X className="h-3 w-3 text-red-500" />
                                                    </Button>
                                                </div>
                                            ) : canEdit ? (
                                                <div className="flex items-center gap-1 flex-1 min-w-0">
                                                    <button
                                                        onClick={() => handleStartEdit(field, value)}
                                                        className="text-sm font-semibold text-slate-800 hover:text-cyan-600 transition-colors flex items-center gap-1 truncate"
                                                    >
                                                        {formatTime(value)}
                                                        <Pencil className="h-3 w-3 opacity-0 group-hover:opacity-100" />
                                                    </button>
                                                    {!value && (
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-6 px-1.5 text-[10px] text-cyan-700 hover:text-cyan-800 hover:bg-cyan-100 shrink-0"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleSetNow(field);
                                                            }}
                                                            disabled={updateMutation.isPending}
                                                        >
                                                            <Clock className="h-2.5 w-2.5 mr-0.5" />
                                                            Now
                                                        </Button>
                                                    )}
                                                </div>
                                            ) : (
                                                <p className="text-sm font-semibold text-slate-800">
                                                    {formatTime(value)}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Derived Durations */}
                        {durations && (
                            <div className="flex flex-wrap items-center gap-3 pt-1">
                                {[
                                    { label: 'OR', value: durations.orTimeMinutes },
                                    { label: 'Surgery', value: durations.surgeryTimeMinutes },
                                    { label: 'Prep', value: durations.prepTimeMinutes },
                                    { label: 'Close-out', value: durations.closeOutTimeMinutes },
                                    { label: 'Anesthesia', value: durations.anesthesiaTimeMinutes },
                                ]
                                    .filter((d) => d.value !== null)
                                    .map((d) => (
                                        <span
                                            key={d.label}
                                            className="text-[11px] text-slate-600 font-medium"
                                        >
                                            {d.label}: <strong>{d.value}min</strong>
                                        </span>
                                    ))}
                            </div>
                        )}
                    </>
                )}
            </CardContent>
        </Card>
    );
}

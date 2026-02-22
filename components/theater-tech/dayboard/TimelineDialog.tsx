/**
 * Component: TimelineDialog
 *
 * Dialog for managing operative timeline timestamps.
 */

import { useState, useEffect } from 'react';
import { format, parseISO } from 'date-fns';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Loader2,
  Timer,
  XCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import type { DayboardCaseDto } from '@/application/dtos/TheaterTechDtos';
import {
  TIMELINE_FIELD_ORDER,
  TIMELINE_FIELD_LABELS,
  type TimelineFieldName,
} from '@/domain/helpers/operativeTimeline';
import { useTimeline, useUpdateTimeline } from '@/hooks/theater-tech/useTimeline';

interface TimelineDialogProps {
  caseData: DayboardCaseDto;
  onClose: () => void;
}

/**
 * Convert ISO string to datetime-local input value.
 */
function toDatetimeLocal(iso: string): string {
  try {
    const date = new Date(iso);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  } catch {
    return '';
  }
}

/**
 * Format timeline value for read-only display.
 */
function formatTimelineValue(iso: string): string {
  try {
    return format(parseISO(iso), 'MMM d, yyyy HH:mm');
  } catch {
    return iso;
  }
}

export function TimelineDialog({ caseData, onClose }: TimelineDialogProps) {
  const { data: timelineData, isLoading: loading } = useTimeline(caseData.id);
  const updateMutation = useUpdateTimeline();
  const [localTimes, setLocalTimes] = useState<Record<string, string>>({});

  const isReadOnly = caseData.status === 'COMPLETED';

  // Pre-fill local times from existing timeline when data loads
  useEffect(() => {
    if (timelineData) {
      const existing: Record<string, string> = {};
      for (const field of TIMELINE_FIELD_ORDER) {
        const val = timelineData.timeline[field];
        if (val) {
          existing[field] = toDatetimeLocal(val);
        }
      }
      setLocalTimes(existing);
    }
  }, [timelineData]);

  const handleSetNow = (field: TimelineFieldName) => {
    const now = new Date();
    setLocalTimes((prev) => ({
      ...prev,
      [field]: toDatetimeLocal(now.toISOString()),
    }));
    // Immediately save this single timestamp
    updateMutation.mutate({
      caseId: caseData.id,
      timestamps: { [field]: now.toISOString() },
    });
  };

  const handleSaveField = (field: TimelineFieldName) => {
    const localVal = localTimes[field];
    if (!localVal) return;
    const isoVal = new Date(localVal).toISOString();
    updateMutation.mutate({
      caseId: caseData.id,
      timestamps: { [field]: isoVal },
    });
  };

  const updateError = updateMutation.error as Error | null;
  const validationErrors = (updateError as { errors?: Array<{ field: string; message: string }> })?.errors || [];

  // Compute durations from current timeline data
  const durations = timelineData?.durations;
  const missingItems = timelineData?.missingItems ?? [];

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base flex items-center gap-2">
            <Timer className="h-4 w-4 text-cyan-600" />
            Operative Timeline
            {isReadOnly && (
              <Badge variant="secondary" className="ml-1 text-[10px] bg-slate-100 text-slate-600">
                View Only
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription className="text-xs">
            <span className="font-semibold">{caseData.patient.fullName}</span> —{' '}
            {caseData.procedureName || 'Procedure'}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="space-y-3 py-4">
            {TIMELINE_FIELD_ORDER.map((f) => (
              <Skeleton key={f} className="h-14 rounded-lg" />
            ))}
          </div>
        ) : (
          <>
            {/* Timeline fields */}
            <div className="space-y-2.5 py-2">
              {TIMELINE_FIELD_ORDER.map((field) => {
                const label = TIMELINE_FIELD_LABELS[field];
                const currentValue = timelineData?.timeline[field];
                const localValue = localTimes[field] || '';
                const fieldError = validationErrors.find((e) => e.field === field);

                return (
                  <div
                    key={field}
                    className={cn(
                      'rounded-lg border p-3 transition-all',
                      currentValue
                        ? 'bg-emerald-50/50 border-emerald-200'
                        : 'bg-white border-slate-200',
                      fieldError && 'border-red-300 bg-red-50/30'
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        {currentValue ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                        ) : (
                          <Clock className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        )}
                        <span className="text-sm font-medium text-slate-800">{label}</span>
                      </div>

                      {!isReadOnly && !currentValue && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-[10px] px-2 text-cyan-700 border-cyan-300 bg-cyan-50 hover:bg-cyan-100"
                          disabled={updateMutation.isPending}
                          onClick={() => handleSetNow(field)}
                        >
                          <Clock className="h-3 w-3 mr-1" />
                          Set Now
                        </Button>
                      )}
                    </div>

                    <div className="mt-2">
                      {isReadOnly ? (
                        <p className="text-xs text-muted-foreground">
                          {currentValue ? formatTimelineValue(currentValue) : 'Not recorded'}
                        </p>
                      ) : (
                        <div className="flex items-center gap-2">
                          <input
                            type="datetime-local"
                            value={localValue}
                            onChange={(e) =>
                              setLocalTimes((prev) => ({
                                ...prev,
                                [field]: e.target.value,
                              }))
                            }
                            className="flex-1 h-8 text-xs rounded-md border border-slate-200 px-2 bg-white focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
                          />
                          {localValue && localValue !== toDatetimeLocal(currentValue || '') && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-[10px] px-2"
                              disabled={updateMutation.isPending}
                              onClick={() => handleSaveField(field)}
                            >
                              {updateMutation.isPending ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                'Save'
                              )}
                            </Button>
                          )}
                        </div>
                      )}
                    </div>

                    {fieldError && (
                      <p className="mt-1 text-[11px] text-red-600 flex items-center gap-1">
                        <XCircle className="h-3 w-3 shrink-0" />
                        {fieldError.message}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Derived durations */}
            {durations && (
              <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                  Derived Durations
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: 'OR Time', value: durations.orTimeMinutes, unit: 'min' },
                    { label: 'Surgery Time', value: durations.surgeryTimeMinutes, unit: 'min' },
                    { label: 'Prep Time', value: durations.prepTimeMinutes, unit: 'min' },
                    { label: 'Close-out Time', value: durations.closeOutTimeMinutes, unit: 'min' },
                    { label: 'Anesthesia Time', value: durations.anesthesiaTimeMinutes, unit: 'min' },
                  ].map((d) => (
                    <div key={d.label} className="flex items-baseline gap-1.5">
                      <span className="text-xs text-muted-foreground">{d.label}:</span>
                      <span className="text-xs font-semibold text-slate-800">
                        {d.value !== null ? `${d.value} ${d.unit}` : '—'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Missing items soft warnings */}
            {missingItems.length > 0 && (
              <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-700 mb-1.5">
                  Missing for current status ({caseData.status.replace(/_/g, ' ')})
                </p>
                <div className="space-y-1">
                  {missingItems.map((item) => (
                    <div
                      key={item.field}
                      className="flex items-center gap-1.5 text-xs text-amber-700"
                    >
                      <AlertTriangle className="h-3 w-3 shrink-0" />
                      {item.label}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* General error */}
            {updateError && validationErrors.length === 0 && (
              <p className="text-xs text-red-600 bg-red-50 rounded-md p-2">{updateError.message}</p>
            )}
          </>
        )}

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

'use client';

import { useMemo, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Settings2, Clock, Timer, Pause, AlertTriangle, CheckCircle2, 
  Info, Sparkles
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { 
  validateSlotConfig, 
  calculateOverlapStats, 
  SLOT_CONFIG_PRESETS,
  getMatchingPreset,
  type SlotConfiguration 
} from '@/lib/validation/slotConfigValidation';

interface SlotConfigurationPanelProps {
  config: SlotConfiguration;
  onChange: (config: SlotConfiguration) => void;
  className?: string;
}

export function SlotConfigurationPanel({
  config,
  onChange,
  className,
}: SlotConfigurationPanelProps) {
  // Validate configuration
  const validation = useMemo(() => validateSlotConfig(config), [config]);
  const overlapStats = useMemo(() => calculateOverlapStats(config), [config]);
  const matchingPreset = useMemo(() => getMatchingPreset(config), [config]);
  
  // Track previous config to detect changes
  const prevConfigRef = useRef<SlotConfiguration>(config);
  const hasShownToastRef = useRef<Set<string>>(new Set());

  const updateConfig = (updates: Partial<SlotConfiguration>) => {
    onChange({ ...config, ...updates });
  };

  // Show toast only once per error type when it first appears
  useEffect(() => {
    const errors = validation.issues.filter(i => i.severity === 'error');
    const criticalError = errors.find(e => {
      const key = `${e.severity}-${e.message}`;
      if (!hasShownToastRef.current.has(key)) {
        hasShownToastRef.current.add(key);
        return true;
      }
      return false;
    });

    if (criticalError) {
      toast.error(criticalError.message, {
        description: criticalError.suggestion,
        duration: 5000,
      });
    }

    // Reset toast tracking when config changes significantly
    if (JSON.stringify(prevConfigRef.current) !== JSON.stringify(config)) {
      prevConfigRef.current = config;
      // Clear toast tracking for new config state
      if (validation.isValid) {
        hasShownToastRef.current.clear();
      }
    }
  }, [config, validation]);

  const applyPreset = (presetKey: string) => {
    const preset = SLOT_CONFIG_PRESETS[presetKey];
    if (preset) {
      onChange({
        defaultDuration: preset.defaultDuration,
        slotInterval: preset.slotInterval,
        bufferTime: preset.bufferTime,
      });
      toast.success(`Applied "${preset.label}" preset`, {
        description: preset.description,
      });
    }
  };

  const applyRecommended = () => {
    if (validation.recommendedConfig) {
      onChange(validation.recommendedConfig);
      toast.success('Applied recommended configuration', {
        description: 'Settings optimized for best performance',
      });
    }
  };

  const applyAutoFix = (autoFix: () => Partial<SlotConfiguration>) => {
    const fix = autoFix();
    onChange({ ...config, ...fix });
    toast.success('Configuration auto-fixed', {
      description: 'Invalid settings have been corrected',
    });
  };

  // Group issues by severity
  const errors = validation.issues.filter(i => i.severity === 'error');
  const warnings = validation.issues.filter(i => i.severity === 'warning');

  return (
    <Card className={cn('shadow-sm', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings2 className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-sm">Slot Configuration</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            {/* Validation Status Badge */}
            {errors.length > 0 ? (
              <Badge variant="destructive" className="text-xs gap-1">
                <AlertTriangle className="h-3 w-3" />
                {errors.length} Issue{errors.length > 1 ? 's' : ''}
              </Badge>
            ) : warnings.length > 0 ? (
              <Badge variant="outline" className="text-xs gap-1 border-amber-300 text-amber-700 dark:text-amber-400">
                <Info className="h-3 w-3" />
                {warnings.length} Warning{warnings.length > 1 ? 's' : ''}
              </Badge>
            ) : (
              <Badge variant="outline" className="text-xs gap-1 border-green-300 text-green-700 dark:text-green-400">
                <CheckCircle2 className="h-3 w-3" />
                Valid
              </Badge>
            )}
            {/* Recommended Config Quick Action */}
            {validation.recommendedConfig && !validation.isValid && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs gap-1"
                onClick={applyRecommended}
              >
                <Sparkles className="h-3 w-3" />
                Apply Recommended
              </Button>
            )}
          </div>
        </div>
        <CardDescription className="text-xs">
          Configure how appointment slots are generated from your availability
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Compact Validation Summary - Only show if there are issues */}
        {(errors.length > 0 || warnings.length > 0) && (
          <div className="rounded-lg bg-muted/30 p-3 space-y-2 border">
            {errors.length > 0 && (
              <div className="space-y-1">
                {errors.map((issue, idx) => (
                  <div key={idx} className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <p className="text-xs font-medium text-red-700 dark:text-red-400">
                        {issue.message}
                      </p>
                      {issue.suggestion && (
                        <p className="text-[0.65rem] text-muted-foreground mt-0.5">
                          {issue.suggestion}
                        </p>
                      )}
                    </div>
                    {issue.autoFix && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-6 text-xs px-2"
                        onClick={() => applyAutoFix(issue.autoFix!)}
                      >
                        Fix
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
            {warnings.length > 0 && (
              <div className="space-y-1 pt-1 border-t">
                {warnings.map((issue, idx) => (
                  <div key={idx} className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <p className="text-xs text-amber-700 dark:text-amber-400">
                        {issue.message}
                      </p>
                      {issue.suggestion && (
                        <p className="text-[0.65rem] text-muted-foreground mt-0.5">
                          {issue.suggestion}
                        </p>
                      )}
                    </div>
                    {issue.autoFix && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 text-xs px-2"
                        onClick={() => applyAutoFix(issue.autoFix!)}
                      >
                        Fix
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Overlap Info - Subtle inline hint */}
        {overlapStats.hasOverlap && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Info className="h-3.5 w-3.5" />
            <span>
              {overlapStats.overlapCount}x overlap per {config.defaultDuration}-min period
              {overlapStats.overlapCount > 3 && ' • High complexity'}
            </span>
          </div>
        )}

        {/* Quick Presets */}
        <div className="space-y-2">
          <Label className="text-xs font-medium text-muted-foreground">Quick Presets</Label>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(SLOT_CONFIG_PRESETS).map(([key, preset]) => (
              <Button
                key={key}
                variant={matchingPreset === key ? 'default' : 'outline'}
                size="sm"
                className="h-auto py-2 flex flex-col items-start text-left"
                onClick={() => applyPreset(key)}
              >
                <span className="text-xs font-semibold">{preset.label}</span>
                <span className="text-[0.65rem] text-muted-foreground mt-0.5">
                  {preset.description}
                </span>
              </Button>
            ))}
          </div>
        </div>

        {/* Default Duration */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-medium flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              Default Duration
            </Label>
            <span className="text-xs font-mono text-muted-foreground">{config.defaultDuration} min</span>
          </div>
          <Slider
            value={[config.defaultDuration]}
            onValueChange={([value]) => {
              let newDuration = value;
              
              // Smart constraint: If duration increases and interval becomes too small, adjust interval
              const minIntervalForNewDuration = Math.ceil(newDuration * 0.3);
              if (config.slotInterval < minIntervalForNewDuration) {
                // Auto-adjust interval to maintain reasonable overlap
                const newInterval = Math.max(
                  newDuration >= 30 ? 10 : 5, // Minimum 10 for 30+ min, 5 otherwise
                  minIntervalForNewDuration
                );
                updateConfig({ 
                  defaultDuration: newDuration,
                  slotInterval: newInterval 
                });
              } else {
                updateConfig({ defaultDuration: newDuration });
              }
            }}
            min={15}
            max={120}
            step={5}
            className="w-full"
          />
          <div className="flex justify-between text-[0.65rem] text-muted-foreground">
            <span>15 min</span>
            <span>120 min</span>
          </div>
          <p className="text-[0.65rem] text-muted-foreground">
            How long each appointment slot lasts
          </p>
        </div>

        {/* Slot Interval */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-medium flex items-center gap-1.5">
              <Timer className="h-3.5 w-3.5" />
              Slot Interval
            </Label>
            <span className="text-xs font-mono text-muted-foreground">{config.slotInterval} min</span>
          </div>
          <Slider
            value={[config.slotInterval]}
            onValueChange={([value]) => {
              // Smart constraints to prevent problematic configurations
              let newInterval = value;
              
              // Constraint 1: For 30+ min appointments, minimum interval is 10 minutes
              if (config.defaultDuration >= 30 && newInterval < 10) {
                newInterval = 10;
              }
              
              // Constraint 2: Prevent extreme overlap (interval < 30% of duration)
              const minIntervalForDuration = Math.ceil(config.defaultDuration * 0.3);
              if (newInterval < minIntervalForDuration) {
                newInterval = minIntervalForDuration;
              }
              
              // Constraint 3: Absolute minimum is 5 minutes (but warn if too small)
              newInterval = Math.max(5, newInterval);
              
              updateConfig({ slotInterval: newInterval });
            }}
            min={5}
            max={60}
            step={5}
            className="w-full"
          />
          <div className="flex justify-between text-[0.65rem] text-muted-foreground">
            <span>5 min</span>
            <span>60 min</span>
          </div>
          <p className="text-[0.65rem] text-muted-foreground">
            How often to generate new slot start times (e.g., 25 min = 9:00, 9:25, 9:50...). Independent of duration - controls when slots begin, not how long they last.
          </p>
        </div>

        {/* Buffer Time */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-medium flex items-center gap-1.5">
              <Pause className="h-3.5 w-3.5" />
              Buffer Time
            </Label>
            <span className="text-xs font-mono text-muted-foreground">{config.bufferTime} min</span>
          </div>
          <Slider
            value={[config.bufferTime]}
            onValueChange={([value]) => updateConfig({ bufferTime: value })}
            min={0}
            max={30}
            step={5}
            className="w-full"
          />
          <div className="flex justify-between text-[0.65rem] text-muted-foreground">
            <span>0 min</span>
            <span>30 min</span>
          </div>
          <p className="text-[0.65rem] text-muted-foreground">
            Time between appointments (prevents back-to-back bookings)
          </p>
        </div>

        {/* Preview with Validation */}
        <div className="pt-3 border-t">
          <p className="text-xs font-medium text-muted-foreground mb-2">Example:</p>
          <div className={cn(
            "rounded-md p-3 space-y-1",
            validation.isValid 
              ? "bg-green-50 dark:bg-green-950/20 border border-green-200" 
              : "bg-muted/50"
          )}>
            <p className="text-[0.65rem] text-muted-foreground">
              With a 9:00 AM - 5:00 PM availability:
            </p>
            <p className="text-xs font-mono text-foreground">
              {(() => {
                // Calculate first slot
                const firstStart = '9:00';
                const firstEndMin = config.defaultDuration % 60;
                const firstEndHour = 9 + Math.floor(config.defaultDuration / 60);
                const firstSlot = `${firstStart}-${String(firstEndHour).padStart(2, '0')}:${String(firstEndMin).padStart(2, '0')}`;
                
                // Calculate second slot (starts at interval, regardless of duration)
                const intervalMin = config.slotInterval % 60;
                const intervalHour = Math.floor(config.slotInterval / 60);
                const secondStartMin = intervalMin;
                const secondStartHour = 9 + intervalHour;
                const secondStart = `${String(secondStartHour).padStart(2, '0')}:${String(secondStartMin).padStart(2, '0')}`;
                
                const secondEndMin = (secondStartMin + config.defaultDuration) % 60;
                const secondEndHour = secondStartHour + Math.floor((secondStartMin + config.defaultDuration) / 60);
                const secondSlot = `${secondStart}-${String(secondEndHour).padStart(2, '0')}:${String(secondEndMin).padStart(2, '0')}`;
                
                return `Slot 1: ${firstSlot} | Slot 2: ${secondSlot} (starts ${config.slotInterval} min later)`;
              })()}
            </p>
            {overlapStats.hasOverlap && (
              <p className="text-[0.65rem] text-amber-600 dark:text-amber-400 mt-1">
                ⚠️ {overlapStats.overlapCount}x overlap - {overlapStats.overlapCount > 3 ? 'High complexity' : 'Moderate complexity'}
              </p>
            )}
            {!overlapStats.hasOverlap && overlapStats.gapBetweenSlots > 0 && (
              <p className="text-[0.65rem] text-blue-600 dark:text-blue-400 mt-1">
                ℹ️ {overlapStats.gapBetweenSlots}-minute gaps between slots
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

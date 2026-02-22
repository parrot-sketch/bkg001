/**
 * Slot Configuration Validation
 * 
 * Validates slot configuration settings to prevent problematic configurations
 * that could lead to overbooking, confusion, or system issues.
 */

export interface SlotConfiguration {
  defaultDuration: number; // minutes
  slotInterval: number; // minutes
  bufferTime: number; // minutes
}

export type ValidationSeverity = 'error' | 'warning' | 'info';

export interface ValidationIssue {
  severity: ValidationSeverity;
  message: string;
  suggestion?: string;
  autoFix?: () => Partial<SlotConfiguration>;
}

export interface ValidationResult {
  isValid: boolean;
  issues: ValidationIssue[];
  recommendedConfig?: SlotConfiguration;
}

/**
 * Validates slot configuration and returns issues and recommendations
 */
export function validateSlotConfig(config: SlotConfiguration): ValidationResult {
  const issues: ValidationIssue[] = [];
  const { defaultDuration, slotInterval, bufferTime } = config;

  // Calculate overlap ratio
  const overlapRatio = defaultDuration / slotInterval;
  const slotsPerDuration = Math.ceil(overlapRatio);

  // Issue 1: Extreme overlap (interval too small relative to duration)
  if (slotInterval < defaultDuration * 0.3) {
    issues.push({
      severity: 'error',
      message: `Extreme overlap detected: ${slotsPerDuration}x overlapping slots per ${defaultDuration}-minute period. This will cause overbooking and confusion.`,
      suggestion: `Increase interval to at least ${Math.ceil(defaultDuration * 0.5)} minutes, or reduce duration to ${Math.ceil(slotInterval * 2)} minutes.`,
      autoFix: () => ({
        slotInterval: Math.max(15, Math.ceil(defaultDuration * 0.5)),
      }),
    });
  } else if (slotInterval < defaultDuration * 0.5) {
    issues.push({
      severity: 'warning',
      message: `High overlap: ${slotsPerDuration}x overlapping slots. This requires complex conflict management.`,
      suggestion: `Consider increasing interval to ${Math.ceil(defaultDuration * 0.5)} minutes for better manageability.`,
      autoFix: () => ({
        slotInterval: Math.ceil(defaultDuration * 0.5),
      }),
    });
  }

  // Issue 2: Interval too small (absolute minimum)
  if (slotInterval < 10) {
    issues.push({
      severity: 'error',
      message: `Interval of ${slotInterval} minutes is too small. This creates excessive slots and system complexity.`,
      suggestion: 'Minimum recommended interval is 10 minutes. Consider 15-30 minutes for better balance.',
      autoFix: () => ({
        slotInterval: 15,
      }),
    });
  }

  // Issue 3: No buffer time with back-to-back appointments
  if (bufferTime === 0 && slotInterval >= defaultDuration) {
    issues.push({
      severity: 'warning',
      message: 'No buffer time with back-to-back appointments. No time for documentation or handling delays.',
      suggestion: 'Add 5-10 minutes buffer time for documentation and preparation.',
      autoFix: () => ({
        bufferTime: 5,
      }),
    });
  }

  // Issue 4: Buffer time too large relative to duration
  if (bufferTime > defaultDuration * 0.5) {
    issues.push({
      severity: 'warning',
      message: `Buffer time (${bufferTime} min) is very large relative to duration (${defaultDuration} min). This significantly reduces available slots.`,
      suggestion: `Consider reducing buffer to ${Math.ceil(defaultDuration * 0.3)} minutes or less.`,
      autoFix: () => ({
        bufferTime: Math.min(15, Math.ceil(defaultDuration * 0.3)),
      }),
    });
  }

  // Issue 5: Interval much larger than duration (inefficient)
  if (slotInterval > defaultDuration * 1.5) {
    issues.push({
      severity: 'info',
      message: `Large gaps between slots (${slotInterval - defaultDuration} minutes). This reduces efficiency but provides comfortable spacing.`,
      suggestion: 'This is fine if you need buffer time, but consider using the Buffer Time setting instead for clearer configuration.',
    });
  }

  // Issue 6: Duration too short for medical appointments
  if (defaultDuration < 15) {
    issues.push({
      severity: 'warning',
      message: `Duration of ${defaultDuration} minutes is very short for medical appointments.`,
      suggestion: 'Minimum recommended duration is 15 minutes. Consider 30 minutes for standard consultations.',
      autoFix: () => ({
        defaultDuration: 15,
      }),
    });
  }

  // Issue 7: Duration too long (may not fit in availability windows)
  if (defaultDuration > 120) {
    issues.push({
      severity: 'info',
      message: `Duration of ${defaultDuration} minutes is very long. Ensure your availability windows are large enough.`,
    });
  }

  // Calculate recommended configuration
  const recommendedConfig = calculateRecommendedConfig(config, issues);

  return {
    isValid: issues.filter(i => i.severity === 'error').length === 0,
    issues,
    recommendedConfig,
  };
}

/**
 * Calculates a recommended configuration based on current settings and issues
 */
function calculateRecommendedConfig(
  current: SlotConfiguration,
  issues: ValidationIssue[]
): SlotConfiguration {
  let recommended = { ...current };

  // Apply auto-fixes for errors
  const errorIssues = issues.filter(i => i.severity === 'error' && i.autoFix);
  for (const issue of errorIssues) {
    const fix = issue.autoFix!();
    recommended = { ...recommended, ...fix };
  }

  // Smart defaults based on duration
  if (recommended.defaultDuration >= 30 && recommended.slotInterval < 15) {
    recommended.slotInterval = 15; // Minimum for 30+ min appointments
  }

  if (recommended.bufferTime === 0 && recommended.slotInterval >= recommended.defaultDuration) {
    recommended.bufferTime = 5; // Add buffer for back-to-back
  }

  return recommended;
}

/**
 * Preset configurations for common use cases
 */
export const SLOT_CONFIG_PRESETS: Record<string, SlotConfiguration & { label: string; description: string }> = {
  standard: {
    label: 'Standard Efficient',
    description: 'Back-to-back appointments, no overlaps, 5-min buffer',
    defaultDuration: 30,
    slotInterval: 30,
    bufferTime: 5,
  },
  flexible: {
    label: 'Flexible Scheduling',
    description: 'Moderate overlap (2x), 15-min intervals, 5-min buffer',
    defaultDuration: 30,
    slotInterval: 15,
    bufferTime: 5,
  },
  comfortable: {
    label: 'Comfortable Pace',
    description: 'Gaps between appointments, 10-min buffer',
    defaultDuration: 30,
    slotInterval: 45,
    bufferTime: 10,
  },
  quick: {
    label: 'Quick Consultations',
    description: '15-min appointments, back-to-back',
    defaultDuration: 15,
    slotInterval: 15,
    bufferTime: 3,
  },
  extended: {
    label: 'Extended Consultations',
    description: '60-min appointments with buffer',
    defaultDuration: 60,
    slotInterval: 60,
    bufferTime: 15,
  },
};

/**
 * Gets the best matching preset for a configuration
 */
export function getMatchingPreset(config: SlotConfiguration): string | null {
  for (const [key, preset] of Object.entries(SLOT_CONFIG_PRESETS)) {
    if (
      preset.defaultDuration === config.defaultDuration &&
      preset.slotInterval === config.slotInterval &&
      preset.bufferTime === config.bufferTime
    ) {
      return key;
    }
  }
  return null;
}

/**
 * Calculates overlap statistics for a configuration
 */
export function calculateOverlapStats(config: SlotConfiguration) {
  const { defaultDuration, slotInterval } = config;
  const overlapRatio = defaultDuration / slotInterval;
  const slotsPerDuration = Math.ceil(overlapRatio);
  const hasOverlap = slotInterval < defaultDuration;
  const overlapCount = hasOverlap ? slotsPerDuration : 1;

  return {
    hasOverlap,
    overlapCount,
    overlapRatio,
    slotsPerDuration,
    gapBetweenSlots: slotInterval > defaultDuration ? slotInterval - defaultDuration : 0,
  };
}

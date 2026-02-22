/**
 * useSlotConfiguration Hook
 * 
 * Manages slot configuration state and validation.
 * Extracted from ScheduleSettingsPanelV2 for better separation of concerns.
 */

import { useState, useMemo, useCallback } from 'react';
import { SlotConfigurationDto } from '@/domain/types/schedule';
import { validateSlotConfig } from '@/lib/validation/slotConfigValidation';

interface UseSlotConfigurationOptions {
  initialConfig?: SlotConfigurationDto | null;
}

const DEFAULT_CONFIG: SlotConfigurationDto = {
  defaultDuration: 30,
  slotInterval: 15,
  bufferTime: 0,
};

export function useSlotConfiguration({ initialConfig }: UseSlotConfigurationOptions) {
  const [config, setConfig] = useState<SlotConfigurationDto>(
    initialConfig || DEFAULT_CONFIG
  );

  const [initialConfigState] = useState<SlotConfigurationDto>(
    initialConfig || DEFAULT_CONFIG
  );

  // Check if there are unsaved changes
  const hasChanges = useMemo(() => {
    return JSON.stringify(config) !== JSON.stringify(initialConfigState);
  }, [config, initialConfigState]);

  // Validate configuration
  const validation = useMemo(() => {
    return validateSlotConfig(config);
  }, [config]);

  // Update configuration
  const updateConfig = useCallback((updates: Partial<SlotConfigurationDto>) => {
    setConfig(prev => ({ ...prev, ...updates }));
  }, []);

  // Reset to initial state
  const reset = useCallback(() => {
    setConfig(initialConfigState);
  }, [initialConfigState]);

  return {
    config,
    hasChanges,
    validation,
    updateConfig,
    reset,
  };
}

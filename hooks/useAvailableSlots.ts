/**
 * Hook: useAvailableSlots
 * 
 * React hook for fetching available appointment slots for a doctor on a specific date.
 * Used in booking dialogs to show real-time availability.
 */

import { useState, useEffect } from 'react';
import { apiClient, ApiResponse } from '@/lib/api/client';
import type { AvailableSlotResponseDto } from '@/application/dtos/AvailableSlotResponseDto';

interface UseAvailableSlotsOptions {
  doctorId: string | null;
  date: Date | null;
  duration?: number; // Optional slot duration in minutes
  enabled?: boolean; // Whether to fetch automatically
}

interface UseAvailableSlotsReturn {
  slots: AvailableSlotResponseDto[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Fetch available slots for a doctor on a specific date
 */
export function useAvailableSlots({
  doctorId,
  date,
  duration,
  enabled = true,
}: UseAvailableSlotsOptions): UseAvailableSlotsReturn {
  const [slots, setSlots] = useState<AvailableSlotResponseDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSlots = async () => {
    if (!doctorId || !date || !enabled) {
      setSlots([]);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Format date as YYYY-MM-DD
      const dateStr = date.toISOString().split('T')[0];
      const url = `/doctors/${doctorId}/slots?date=${dateStr}${duration ? `&duration=${duration}` : ''}`;
      
      const response = await apiClient.get<AvailableSlotResponseDto[]>(url);

      if (response.success && response.data) {
        setSlots(response.data);
      } else if (!response.success) {
        setError(response.error || 'Failed to fetch available slots');
        setSlots([]);
      } else {
        setError('Failed to fetch available slots');
        setSlots([]);
      }
    } catch (err) {
      console.error('Error fetching available slots:', err);
      setError('An error occurred while fetching available slots');
      setSlots([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSlots();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doctorId, date?.toISOString().split('T')[0], duration, enabled]);

  // Expose refetch function that can be called manually
  const refetch = async () => {
    await fetchSlots();
  };

  return {
    slots,
    loading,
    error,
    refetch,
  };
}

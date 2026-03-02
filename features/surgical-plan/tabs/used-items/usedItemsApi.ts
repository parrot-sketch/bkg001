/**
 * Used Items API Client
 * 
 * Typed API client wrapper for used items endpoints.
 */

import { surgicalPlanApi } from '../../shared/api/surgicalPlanApi';
import { parseUsedItemsResponse, type UsedItemsResponseDto } from './usedItemsParsers';
import type { ApiResponse } from '@/lib/api/client';

/**
 * Used Items API client
 */
export const usedItemsApi = {
  /**
   * Get used items for a surgical case
   */
  async getUsedItems(caseId: string): Promise<ApiResponse<UsedItemsResponseDto>> {
    const res = await surgicalPlanApi.getBillingSummary(caseId);
    if (res.success && res.data) {
      return { ...res, data: parseUsedItemsResponse(res.data) };
    }
    return res;
  },
};

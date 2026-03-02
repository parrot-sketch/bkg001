/**
 * Usage Variance API Client
 * 
 * Typed API client wrapper for usage variance endpoints.
 */

import { surgicalPlanApi } from '../../shared/api/surgicalPlanApi';
import { parseUsageVarianceResponse, type UsageVarianceResponseDto } from './usageVarianceParsers';
import type { ApiResponse } from '@/lib/api/client';

/**
 * Usage Variance API client
 */
export const usageVarianceApi = {
  /**
   * Get usage variance for a surgical case
   */
  async getUsageVariance(caseId: string): Promise<ApiResponse<UsageVarianceResponseDto>> {
    const res = await surgicalPlanApi.getUsageVariance(caseId);
    if (res.success && res.data) {
      return { ...res, data: parseUsageVarianceResponse(res.data) };
    }
    return res;
  },
};

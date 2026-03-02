/**
 * Billing Summary API Client
 * 
 * Typed API client wrapper for billing summary endpoints.
 */

import { surgicalPlanApi } from '../../shared/api/surgicalPlanApi';
import { parseBillingSummaryResponse, type BillingSummaryResponseDto } from './billingSummaryParsers';
import type { ApiResponse } from '@/lib/api/client';

/**
 * Billing Summary API client
 */
export const billingSummaryApi = {
  /**
   * Get billing summary for a surgical case
   */
  async getBillingSummary(caseId: string): Promise<ApiResponse<BillingSummaryResponseDto>> {
    const res = await surgicalPlanApi.getBillingSummary(caseId);
    if (res.success && res.data) {
      return { ...res, data: parseBillingSummaryResponse(res.data) };
    }
    return res;
  },
};

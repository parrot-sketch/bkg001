/**
 * Timeline API Client
 * 
 * Typed API client wrapper for timeline endpoints.
 */

import { surgicalPlanApi } from '../../shared/api/surgicalPlanApi';
import { parseTimelineResponse, type TimelineResponseDto } from './timelineParsers';
import type { ApiResponse } from '@/lib/api/client';

/**
 * Timeline API client
 */
export const timelineApi = {
  /**
   * Get timeline for a surgical case
   */
  async getTimeline(caseId: string): Promise<ApiResponse<TimelineResponseDto>> {
    const res = await surgicalPlanApi.getTimeline(caseId);
    if (res.success && res.data) {
      return { ...res, data: parseTimelineResponse(res.data) };
    }
    return res;
  },
};

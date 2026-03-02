/**
 * Surgical Plan API Client
 * 
 * Typed API client wrapper for surgical plan endpoints.
 * Uses the repo's apiClient pattern (no direct fetch).
 */

import { apiClient, type ApiResponse } from '@/lib/api/client';
import type { CasePlanDetailDto } from '@/lib/api/case-plan';
import type { TimelineResultDto } from '@/application/dtos/TheaterTechDtos';
import type { UpdateClinicalPlanRequest } from '../parsers/surgicalPlanParsers';

/**
 * Surgical Plan API client
 */
export const surgicalPlanApi = {
  /**
   * Get full case plan detail by surgical case ID
   */
  async getCasePlanDetail(caseId: string): Promise<ApiResponse<CasePlanDetailDto>> {
    return apiClient.get<CasePlanDetailDto>(`/doctor/surgical-cases/${caseId}/plan`);
  },

  /**
   * Update clinical plan fields (partial update)
   */
  async updateClinicalPlan(
    caseId: string,
    data: UpdateClinicalPlanRequest
  ): Promise<ApiResponse<CasePlanDetailDto>> {
    return apiClient.patch<CasePlanDetailDto>(`/doctor/surgical-cases/${caseId}/plan`, data);
  },

  /**
   * Mark case as ready for scheduling
   */
  async markCaseReady(caseId: string): Promise<ApiResponse<{ caseId: string; status: string }>> {
    return apiClient.post<{ caseId: string; status: string }>(
      `/doctor/surgical-cases/${caseId}/mark-ready`,
      {}
    );
  },

  /**
   * Get operative timeline for a case
   */
  async getTimeline(caseId: string): Promise<ApiResponse<TimelineResultDto>> {
    return apiClient.get<TimelineResultDto>(`/theater-tech/surgical-cases/${caseId}/timeline`);
  },

  /**
   * Update procedure fields only
   */
  async patchProcedurePlan(
    caseId: string,
    data: { procedureName?: string; procedurePlan?: string }
  ): Promise<ApiResponse<CasePlanDetailDto>> {
    return apiClient.patch<CasePlanDetailDto>(`/doctor/surgical-cases/${caseId}/plan`, data);
  },

  /**
   * Update risk factors fields only
   */
  async patchRiskFactors(
    caseId: string,
    data: { riskFactors?: string; preOpNotes?: string }
  ): Promise<ApiResponse<CasePlanDetailDto>> {
    return apiClient.patch<CasePlanDetailDto>(`/doctor/surgical-cases/${caseId}/plan`, data);
  },

  /**
   * Update anesthesia fields only
   */
  async patchAnesthesia(
    caseId: string,
    data: { anesthesiaPlan?: string | null; specialInstructions?: string; estimatedDurationMinutes?: number | null }
  ): Promise<ApiResponse<CasePlanDetailDto>> {
    return apiClient.patch<CasePlanDetailDto>(`/doctor/surgical-cases/${caseId}/plan`, data);
  },

  /**
   * Get billing summary for a surgical case
   */
  async getBillingSummary(caseId: string): Promise<ApiResponse<any>> {
    return apiClient.get<any>(`/nurse/surgical-cases/${caseId}/billing-summary`);
  },

  /**
   * Get usage variance for a surgical case
   */
  async getUsageVariance(caseId: string): Promise<ApiResponse<any>> {
    return apiClient.get<any>(`/surgical-cases/${caseId}/usage-variance`);
  },
};

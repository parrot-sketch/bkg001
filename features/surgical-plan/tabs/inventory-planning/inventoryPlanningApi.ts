/**
 * Inventory Planning API Client
 * 
 * Typed API client wrapper for inventory planning endpoints.
 * Uses the repo's apiClient pattern (no direct fetch).
 */

import { apiClient, type ApiResponse } from '@/lib/api/client';
import type {
  PlannedItemsResponse,
  ReplacePlannedItemsRequest,
  UsageVarianceResponse,
  ConsumeFromPlanRequest,
  InventoryItemsResponse,
} from './inventoryPlanningParsers';
import { InventoryCategory } from '@/domain/enums/InventoryCategory';

/**
 * Usage response from POST /api/nurse/surgical-cases/[caseId]/usage
 */
export interface UsageResponse {
  usageRecord: {
    id: number;
    inventoryItemId: number;
    quantityUsed: number;
    externalRef: string;
  };
  billItem: {
    id: number;
    totalCost: number;
  } | null;
  metadata: {
    isIdempotentReplay: boolean;
    appliedUsageCount: number;
    appliedBillLinesCount: number;
    stockWarnings: Array<{
      inventoryItemId: number;
      requested: number;
      available: number;
    }>;
  };
}

/**
 * Inventory Planning API client
 */
export const inventoryPlanningApi = {
  /**
   * Get planned items for a surgical case
   */
  async getPlannedItems(caseId: string): Promise<ApiResponse<PlannedItemsResponse>> {
    return apiClient.get<PlannedItemsResponse>(
      `/doctor/surgical-cases/${caseId}/planned-items`
    );
  },

  /**
   * Replace planned items for a surgical case
   */
  async replacePlannedItems(
    caseId: string,
    data: ReplacePlannedItemsRequest
  ): Promise<ApiResponse<PlannedItemsResponse>> {
    return apiClient.post<PlannedItemsResponse>(
      `/doctor/surgical-cases/${caseId}/planned-items`,
      data
    );
  },

  /**
   * Get usage variance for a surgical case
   */
  async getUsageVariance(caseId: string): Promise<ApiResponse<UsageVarianceResponse>> {
    return apiClient.get<UsageVarianceResponse>(
      `/surgical-cases/${caseId}/usage-variance`
    );
  },

  /**
   * Consume from plan (record usage)
   */
  async consumeFromPlan(
    caseId: string,
    data: ConsumeFromPlanRequest
  ): Promise<ApiResponse<UsageResponse>> {
    return apiClient.post<UsageResponse>(
      `/nurse/surgical-cases/${caseId}/usage`,
      data
    );
  },

  /**
   * Get inventory items (for selector)
   */
  async getInventoryItems(params: {
    category?: InventoryCategory;
    search?: string;
    page?: number;
    pageSize?: number;
  }): Promise<ApiResponse<InventoryItemsResponse>> {
    const queryParams = new URLSearchParams();
    if (params.category) queryParams.set('category', params.category);
    if (params.search) queryParams.set('search', params.search);
    if (params.page) queryParams.set('page', params.page.toString());
    if (params.pageSize) queryParams.set('pageSize', params.pageSize.toString());

    const query = queryParams.toString();
    return apiClient.get<InventoryItemsResponse>(
      `/inventory/items${query ? `?${query}` : ''}`
    );
  },
};

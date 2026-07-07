import { apiClient, ApiResponse } from './client';

export interface InventoryItemDto {
  id: number;
  name: string;
  sku: string | null;
  category: string;
  description: string | null;
  unitOfMeasure: string;
  unitCost: number;
  isBillable: boolean;
  quantityOnHand: number;
}

export interface InventoryListResponse {
  data: InventoryItemDto[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export const inventoryApi = {
  getAll: async (params?: { limit?: number }): Promise<ApiResponse<InventoryListResponse>> => {
    const searchParams = new URLSearchParams();
    if (params?.limit) searchParams.set('limit', String(params.limit));
    const query = searchParams.toString();
    return apiClient.get<InventoryListResponse>(`/inventory/items${query ? `?${query}` : ''}`);
  },
};

import { useState } from 'react';
import { apiClient } from '@/lib/api/client';
import { toast } from 'sonner';
import { InventoryItem } from '@/domain/interfaces/repositories/IInventoryRepository';
import { StockAdjustmentType, StockAdjustmentReason } from '@prisma/client';

export interface CreateItemPayload {
  name: string;
  sku?: string;
  category: string;
  unit_of_measure: string;
  unit_cost: number;
  reorder_point: number;
  low_stock_threshold: number;
  description?: string;
  supplier?: string;
  manufacturer?: string;
  is_billable: boolean;
  is_implant: boolean;
}

export interface UpdateItemPayload extends Partial<CreateItemPayload> {}

export interface AdjustStockPayload {
  adjustmentType: StockAdjustmentType;
  adjustmentReason: StockAdjustmentReason;
  quantityChange: number;
  notes?: string;
}

export function useInventoryItems() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createItem = async (payload: CreateItemPayload): Promise<InventoryItem | null> => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.request<{ item: InventoryItem }>('/inventory/items', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      if (!response.success) {
        throw new Error((response as any).error || 'Failed to create item');
      }
      return (response as any).data.item;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create item';
      setError(message);
      toast.error(message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const updateItem = async (id: number, payload: UpdateItemPayload): Promise<InventoryItem | null> => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.request<{ item: InventoryItem }>(`/inventory/items/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
      if (!response.success) {
        throw new Error((response as any).error || 'Failed to update item');
      }
      return (response as any).data.item;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update item';
      setError(message);
      toast.error(message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const adjustStock = async (itemId: number, payload: AdjustStockPayload): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.request(`/stores/inventory/${itemId}/adjust`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      if (!response.success) {
        throw new Error((response as any).error || 'Failed to adjust stock');
      }
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to adjust stock';
      setError(message);
      toast.error(message);
      return false;
    } finally {
      setLoading(false);
    }
  };

  return { createItem, updateItem, adjustStock, loading, error };
}

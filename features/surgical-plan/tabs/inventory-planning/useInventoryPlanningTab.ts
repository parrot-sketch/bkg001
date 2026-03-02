/**
 * Hook: useInventoryPlanningTab
 * 
 * Data loading and actions for inventory planning tab.
 * No JSX returned - pure logic only.
 */

import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { inventoryPlanningApi } from './inventoryPlanningApi';
import {
  parsePlannedItemsResponse,
  parseUsageVarianceResponse,
  parseInventoryItemsResponse,
  parseReplacePlannedItemsRequest,
  parseConsumeFromPlanRequest,
} from './inventoryPlanningParsers';
import {
  mapPlannedItemsDtoToVm,
  mapInventoryItemsDtoToSelectorVm,
  mapUsageVarianceDtoToVm,
  buildConsumeFromPlanPayload,
  type PlannedItemViewModel,
  type InventoryItemSelectorViewModel,
  type UsageVarianceViewModel,
  type CostEstimateViewModel,
} from './inventoryPlanningMappers';
import { InventoryCategory } from '@/domain/enums/InventoryCategory';

interface UseInventoryPlanningTabResult {
  // Data
  plannedItems: PlannedItemViewModel[];
  costEstimate: CostEstimateViewModel | null;
  variance: UsageVarianceViewModel | null;
  inventoryItems: InventoryItemSelectorViewModel[];
  
  // Loading states
  isLoadingPlanned: boolean;
  isLoadingVariance: boolean;
  isLoadingInventory: boolean;
  isSaving: boolean;
  isConsuming: boolean;
  
  // Errors
  error: Error | null;
  
  // Search/filter state
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedCategory: InventoryCategory | 'ALL';
  setSelectedCategory: (category: InventoryCategory | 'ALL') => void;
  
  // Editing state
  editingItems: Map<number, { quantity: number; notes: string }>;
  updateEditingItem: (itemId: number, updates: { quantity?: number; notes?: string }) => void;
  resetEditing: () => void;
  
  // Actions
  loadInventoryItems: (categories: InventoryCategory[]) => Promise<void>;
  addItemToPlan: (item: InventoryItemSelectorViewModel) => void;
  removeItemFromPlan: (inventoryItemId: number) => void;
  savePlannedItems: () => Promise<void>;
  openConsumeDialog: (itemId: number) => void;
  closeConsumeDialog: () => void;
  consumeFromPlan: (itemId: number, quantity: number, actorUserId: string) => Promise<void>;
  refetchAll: () => void;
  
  // Dialog state
  consumeDialogOpen: boolean;
  consumeDialogItem: PlannedItemViewModel | null;
  consumeDialogQuantity: number;
  setConsumeDialogQuantity: (quantity: number) => void;
}

/**
 * Hook for inventory planning tab
 */
export function useInventoryPlanningTab(
  caseId: string,
  actorUserId: string
): UseInventoryPlanningTabResult {
  const queryClient = useQueryClient();
  
  // Search/filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<InventoryCategory | 'ALL'>('ALL');
  
  // Editing state
  const [editingItems, setEditingItems] = useState<Map<number, { quantity: number; notes: string }>>(new Map());
  
  // Dialog state
  const [consumeDialogOpen, setConsumeDialogOpen] = useState(false);
  const [consumeDialogItem, setConsumeDialogItem] = useState<PlannedItemViewModel | null>(null);
  const [consumeDialogQuantity, setConsumeDialogQuantity] = useState(0);
  
  // Load planned items
  const {
    data: plannedItemsData,
    isLoading: isLoadingPlanned,
    error: plannedError,
    refetch: refetchPlanned,
  } = useQuery({
    queryKey: ['inventory-planning', 'planned-items', caseId],
    queryFn: async () => {
      const response = await inventoryPlanningApi.getPlannedItems(caseId);
      if (!response.success) {
        throw new Error(response.error || 'Failed to load planned items');
      }
      return parsePlannedItemsResponse(response.data);
    },
    enabled: !!caseId,
    staleTime: 1000 * 30, // 30 seconds
  });
  
  // Load usage variance
  const {
    data: varianceData,
    isLoading: isLoadingVariance,
    error: varianceError,
    refetch: refetchVariance,
  } = useQuery({
    queryKey: ['inventory-planning', 'usage-variance', caseId],
    queryFn: async () => {
      const response = await inventoryPlanningApi.getUsageVariance(caseId);
      if (!response.success) {
        throw new Error(response.error || 'Failed to load usage variance');
      }
      return parseUsageVarianceResponse(response.data);
    },
    enabled: !!caseId,
    staleTime: 1000 * 30, // 30 seconds
  });
  
  // Inventory items (lazy loaded on search)
  const [inventoryItemsData, setInventoryItemsData] = useState<InventoryItemSelectorViewModel[]>([]);
  const [isLoadingInventory, setIsLoadingInventory] = useState(false);
  
  const loadInventoryItems = useCallback(async (categories: InventoryCategory[]) => {
    setIsLoadingInventory(true);
    try {
      const responses = await Promise.all(
        categories.map((category) =>
          inventoryPlanningApi.getInventoryItems({
            category,
            pageSize: 100,
            search: searchQuery || undefined,
          })
        )
      );
      
      const allItems: InventoryItemSelectorViewModel[] = [];
      for (const response of responses) {
        if (response.success) {
          const parsed = parseInventoryItemsResponse(response.data);
          allItems.push(...mapInventoryItemsDtoToSelectorVm(parsed));
        }
      }
      
      // Deduplicate by ID
      const uniqueItems = Array.from(
        new Map(allItems.map((item) => [item.id, item])).values()
      );
      setInventoryItemsData(uniqueItems);
    } catch (error) {
      console.error('Error loading inventory items:', error);
      toast.error('Failed to load inventory items');
    } finally {
      setIsLoadingInventory(false);
    }
  }, [searchQuery]);
  
  // Build inventory items map for mappers
  const inventoryItemsMap = new Map(
    inventoryItemsData.map((item) => [
      item.id,
      { quantityOnHand: item.quantityOnHand, reorderPoint: item.reorderPoint },
    ])
  );
  
  // Map to view models
  const { plannedItems, costEstimate } = plannedItemsData
    ? mapPlannedItemsDtoToVm(plannedItemsData, varianceData ?? null, inventoryItemsMap)
    : { plannedItems: [], costEstimate: null };
  
  const variance: UsageVarianceViewModel | null = varianceData
    ? mapUsageVarianceDtoToVm(varianceData, inventoryItemsMap)
    : null;
  
  // Save planned items mutation
  const saveMutation = useMutation({
    mutationFn: async (items: Array<{ inventoryItemId: number; plannedQuantity: number; notes?: string }>) => {
      const request = parseReplacePlannedItemsRequest({ items });
      const response = await inventoryPlanningApi.replacePlannedItems(caseId, request);
      if (!response.success) {
        throw new Error(response.error || 'Failed to save planned items');
      }
      return parsePlannedItemsResponse(response.data);
    },
    onSuccess: () => {
      toast.success('Planned items saved successfully');
      queryClient.invalidateQueries({ queryKey: ['inventory-planning', caseId] });
      resetEditing();
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to save planned items');
    },
  });
  
  // Consume from plan mutation
  const consumeMutation = useMutation({
    mutationFn: async (payload: { itemId: number; quantity: number }) => {
      const plannedItem = plannedItems.find((p) => p.inventoryItemId === payload.itemId);
      if (!plannedItem) {
        throw new Error('Planned item not found');
      }
      
      const request = await buildConsumeFromPlanPayload(
        plannedItem,
        payload.quantity,
        caseId,
        actorUserId
      );
      const parsedRequest = parseConsumeFromPlanRequest(request);
      const response = await inventoryPlanningApi.consumeFromPlan(caseId, parsedRequest);
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to consume item');
      }
      
      return response.data;
    },
    onSuccess: (data) => {
      if (data.metadata.isIdempotentReplay) {
        toast.info('This usage was already recorded');
      } else {
        toast.success('Item consumed successfully');
      }
      setConsumeDialogOpen(false);
      setConsumeDialogItem(null);
      setConsumeDialogQuantity(0);
      queryClient.invalidateQueries({ queryKey: ['inventory-planning', caseId] });
      // Dispatch custom event for other tabs to refresh
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('inventory-usage-updated', { detail: { caseId } })
        );
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to consume item');
    },
  });
  
  // Actions
  const updateEditingItem = useCallback(
    (itemId: number, updates: { quantity?: number; notes?: string }) => {
      setEditingItems((prev) => {
        const newMap = new Map(prev);
        const existing = newMap.get(itemId) || { quantity: 0, notes: '' };
        newMap.set(itemId, {
          quantity: updates.quantity ?? existing.quantity,
          notes: updates.notes ?? existing.notes,
        });
        return newMap;
      });
    },
    []
  );
  
  const resetEditing = useCallback(() => {
    setEditingItems(new Map());
  }, []);
  
  const addItemToPlan = useCallback((item: InventoryItemSelectorViewModel) => {
    // Check if already in plan
    if (plannedItems.some((p) => p.inventoryItemId === item.id)) {
      toast.error('Item already added to plan');
      return;
    }
    
    // Add to editing state (will be saved on savePlannedItems)
    updateEditingItem(item.id, {
      quantity: 1,
      notes: '',
    });
  }, [plannedItems, updateEditingItem]);
  
  const removeItemFromPlan = useCallback((inventoryItemId: number) => {
    setEditingItems((prev) => {
      const newMap = new Map(prev);
      newMap.delete(inventoryItemId);
      return newMap;
    });
  }, []);
  
  const savePlannedItems = useCallback(async () => {
    // Build items list from current planned items + editing changes
    const itemsToSave: Array<{ inventoryItemId: number; plannedQuantity: number; notes?: string }> = [];
    
    // Start with existing planned items (excluding removed ones)
    for (const plannedItem of plannedItems) {
      if (!editingItems.has(plannedItem.inventoryItemId) || editingItems.get(plannedItem.inventoryItemId)?.quantity !== 0) {
        const editing = editingItems.get(plannedItem.inventoryItemId);
        itemsToSave.push({
          inventoryItemId: plannedItem.inventoryItemId,
          plannedQuantity: editing?.quantity ?? plannedItem.plannedQuantity,
          notes: editing?.notes ?? plannedItem.notes ?? undefined,
        });
      }
    }
    
    // Add new items from editing state
    for (const [itemId, editing] of editingItems.entries()) {
      if (!plannedItems.some((p) => p.inventoryItemId === itemId) && editing.quantity > 0) {
        itemsToSave.push({
          inventoryItemId: itemId,
          plannedQuantity: editing.quantity,
          notes: editing.notes || undefined,
        });
      }
    }
    
    await saveMutation.mutateAsync(itemsToSave);
  }, [plannedItems, editingItems, saveMutation]);
  
  const openConsumeDialog = useCallback((itemId: number) => {
    const item = plannedItems.find((p) => p.inventoryItemId === itemId);
    if (!item) return;
    
    const suggestedQuantity = Math.max(0, item.remainingQuantity);
    setConsumeDialogItem(item);
    setConsumeDialogQuantity(suggestedQuantity);
    setConsumeDialogOpen(true);
  }, [plannedItems]);
  
  const closeConsumeDialog = useCallback(() => {
    setConsumeDialogOpen(false);
    setConsumeDialogItem(null);
    setConsumeDialogQuantity(0);
  }, []);
  
  const consumeFromPlan = useCallback(
    async (itemId: number, quantity: number, actorUserId: string) => {
      await consumeMutation.mutateAsync({ itemId, quantity });
    },
    [consumeMutation]
  );
  
  const refetchAll = useCallback(() => {
    refetchPlanned();
    refetchVariance();
  }, [refetchPlanned, refetchVariance]);
  
  // Filter inventory items by search and category
  const filteredInventoryItems = inventoryItemsData.filter((item) => {
    if (selectedCategory !== 'ALL' && item.category !== selectedCategory) {
      return false;
    }
    if (searchQuery.trim()) {
      const search = searchQuery.toLowerCase();
      return (
        item.name.toLowerCase().includes(search) ||
        item.sku?.toLowerCase().includes(search) ||
        item.description?.toLowerCase().includes(search)
      );
    }
    return true;
  });
  
  return {
    plannedItems,
    costEstimate,
    variance,
    inventoryItems: filteredInventoryItems,
    isLoadingPlanned,
    isLoadingVariance,
    isLoadingInventory,
    isSaving: saveMutation.isPending,
    isConsuming: consumeMutation.isPending,
    error: (plannedError || varianceError) as Error | null,
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
    editingItems,
    updateEditingItem,
    resetEditing,
    loadInventoryItems,
    addItemToPlan,
    removeItemFromPlan,
    savePlannedItems,
    openConsumeDialog,
    closeConsumeDialog,
    consumeFromPlan,
    refetchAll,
    consumeDialogOpen,
    consumeDialogItem,
    consumeDialogQuantity,
    setConsumeDialogQuantity,
  };
}

/**
 * Inventory Planning Tab View
 * 
 * Presentational component for inventory planning tab.
 * No API calls, no parsing, no business logic.
 */

'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { LoadingState } from '../../shared/components/LoadingState';
import { ErrorState } from '../../shared/components/ErrorState';
import { SaveBar } from '../../shared/components/SaveBar';
import { InventoryItemSelector } from './components/InventoryItemSelector';
import { PlannedItemsTable } from './components/PlannedItemsTable';
import { ConsumeFromPlanDialog } from './components/ConsumeFromPlanDialog';
import type { PlannedItemViewModel, CostEstimateViewModel } from './inventoryPlanningMappers';
import { InventoryCategory } from '@/domain/enums/InventoryCategory';
import { Package, DollarSign } from 'lucide-react';

interface InventoryPlanningTabViewProps {
  // Data
  plannedItems: PlannedItemViewModel[];
  costEstimate: CostEstimateViewModel | null;
  inventoryItems: Array<{
    id: number;
    name: string;
    sku: string | null;
    category: InventoryCategory;
    description: string | null;
    unitOfMeasure: string;
    unitCost: number;
    quantityOnHand: number;
    reorderPoint: number;
    manufacturer: string | null;
    isActive: boolean;
    isBillable: boolean;
    isLowStock: boolean;
  }>;
  
  // Loading states
  isLoadingPlanned: boolean;
  isLoadingInventory: boolean;
  isSaving: boolean;
  isConsuming: boolean;
  
  // Errors
  error: Error | null;
  
  // Search/filter
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedCategory: InventoryCategory | 'ALL';
  onCategoryChange: (category: InventoryCategory | 'ALL') => void;
  
  // Editing
  editingItems: Map<number, { quantity: number; notes: string }>;
  onQuantityChange: (itemId: number, quantity: number) => void;
  onNotesChange: (itemId: number, notes: string) => void;
  onRemove: (itemId: number) => void;
  
  // Actions
  onLoadInventoryItems: () => void;
  onAddItem: (item: {
    id: number;
    name: string;
    sku: string | null;
    category: InventoryCategory;
    description: string | null;
    unitOfMeasure: string;
    unitCost: number;
    quantityOnHand: number;
    reorderPoint: number;
    manufacturer: string | null;
    isActive: boolean;
    isBillable: boolean;
    isLowStock: boolean;
  }) => void;
  onSave: () => void;
  onConsume: (itemId: number) => void;
  onRetry: () => void;
  
  // Dialog
  consumeDialogOpen: boolean;
  consumeDialogItem: PlannedItemViewModel | null;
  consumeDialogQuantity: number;
  onConsumeDialogQuantityChange: (quantity: number) => void;
  onConsumeDialogClose: () => void;
  onConsumeConfirm: () => void;
  
  // Permissions
  canEdit: boolean;
  canConsume: boolean;
}

export function InventoryPlanningTabView({
  plannedItems,
  costEstimate,
  inventoryItems,
  isLoadingPlanned,
  isLoadingInventory,
  isSaving,
  isConsuming,
  error,
  searchQuery,
  onSearchChange,
  selectedCategory,
  onCategoryChange,
  editingItems,
  onQuantityChange,
  onNotesChange,
  onRemove,
  onLoadInventoryItems,
  onAddItem,
  onSave,
  onConsume,
  onRetry,
  consumeDialogOpen,
  consumeDialogItem,
  consumeDialogQuantity,
  onConsumeDialogQuantityChange,
  onConsumeDialogClose,
  onConsumeConfirm,
  canEdit,
  canConsume,
}: InventoryPlanningTabViewProps) {
  if (error) {
    return <ErrorState error={error} onRetry={onRetry} />;
  }

  if (isLoadingPlanned) {
    return <LoadingState />;
  }

  const hasUnsavedChanges = editingItems.size > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Planned Items</h3>
          <p className="text-sm text-muted-foreground mt-0.5">
            Plan inventory items for this surgical case
          </p>
        </div>
        {costEstimate && (
          <Card className="border-stone-200">
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Estimated Cost</p>
                  <p className="text-lg font-bold">{costEstimate.grandTotal.toFixed(2)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Tabs: Add Items | Planned Items */}
      <Tabs defaultValue="planned" className="w-full">
        <TabsList>
          <TabsTrigger value="planned">
            <Package className="h-4 w-4 mr-2" />
            Planned Items ({plannedItems.length})
          </TabsTrigger>
          <TabsTrigger value="add">
            Add Items
          </TabsTrigger>
        </TabsList>

        <TabsContent value="planned" className="space-y-4">
          <PlannedItemsTable
            items={plannedItems}
            editingItems={editingItems}
            onQuantityChange={onQuantityChange}
            onNotesChange={onNotesChange}
            onRemove={onRemove}
            onConsume={onConsume}
            canEdit={canEdit}
            canConsume={canConsume}
          />
        </TabsContent>

        <TabsContent value="add" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Add Items to Plan</CardTitle>
              <CardDescription>
                Search and select inventory items to add to your surgical plan
              </CardDescription>
            </CardHeader>
            <CardContent>
              <InventoryItemSelector
                items={inventoryItems}
                searchQuery={searchQuery}
                onSearchChange={onSearchChange}
                selectedCategory={selectedCategory}
                onCategoryChange={onCategoryChange}
                onItemSelect={onAddItem}
                isLoading={isLoadingInventory}
                onLoadItems={onLoadInventoryItems}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Save Bar */}
      {canEdit && hasUnsavedChanges && (
        <SaveBar onSave={onSave} saving={isSaving} label="Save Planned Items" />
      )}

      {/* Consume Dialog */}
      <ConsumeFromPlanDialog
        open={consumeDialogOpen}
        onOpenChange={onConsumeDialogClose}
        item={consumeDialogItem}
        quantity={consumeDialogQuantity}
        onQuantityChange={onConsumeDialogQuantityChange}
        onConfirm={onConsumeConfirm}
        isLoading={isConsuming}
      />
    </div>
  );
}

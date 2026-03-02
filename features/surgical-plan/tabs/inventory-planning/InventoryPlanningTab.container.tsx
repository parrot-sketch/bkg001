/**
 * Inventory Planning Tab Container
 * 
 * Orchestration component that wires hook to view.
 */

'use client';

import { useInventoryPlanningTab } from './useInventoryPlanningTab';
import { InventoryPlanningTabView } from './InventoryPlanningTab.view';
import { InventoryCategory } from '@/domain/enums/InventoryCategory';
import { useAuth } from '@/hooks/patient/useAuth';
import { tokenStorage } from '@/lib/auth/token';

interface InventoryPlanningTabContainerProps {
  caseId: string;
}

export function InventoryPlanningTabContainer({
  caseId,
}: InventoryPlanningTabContainerProps) {
  // Get actor user ID from auth context or token storage
  const { user } = useAuth();
  const storedUser = tokenStorage.getUser();
  const actorUserId = user?.id || storedUser?.id || '';

  const hook = useInventoryPlanningTab(caseId, actorUserId);

  // Load inventory items when component mounts (IMPLANT and INSTRUMENT categories)
  const handleLoadInventoryItems = () => {
    hook.loadInventoryItems([InventoryCategory.IMPLANT, InventoryCategory.INSTRUMENT]);
  };

  // Handle consume confirm
  const handleConsumeConfirm = async () => {
    if (!hook.consumeDialogItem) return;
    await hook.consumeFromPlan(
      hook.consumeDialogItem.inventoryItemId,
      hook.consumeDialogQuantity,
      actorUserId
    );
  };

  // Permissions (TODO: Get from auth context in Phase 2)
  const canEdit = true; // TODO: Check role
  const canConsume = true; // TODO: Check role (NURSE, DOCTOR, ADMIN)

  return (
    <InventoryPlanningTabView
      plannedItems={hook.plannedItems}
      costEstimate={hook.costEstimate}
      inventoryItems={hook.inventoryItems}
      isLoadingPlanned={hook.isLoadingPlanned}
      isLoadingInventory={hook.isLoadingInventory}
      isSaving={hook.isSaving}
      isConsuming={hook.isConsuming}
      error={hook.error}
      searchQuery={hook.searchQuery}
      onSearchChange={hook.setSearchQuery}
      selectedCategory={hook.selectedCategory}
      onCategoryChange={hook.setSelectedCategory}
      editingItems={hook.editingItems}
      onQuantityChange={(itemId, quantity) =>
        hook.updateEditingItem(itemId, { quantity })
      }
      onNotesChange={(itemId, notes) =>
        hook.updateEditingItem(itemId, { notes })
      }
      onRemove={hook.removeItemFromPlan}
      onLoadInventoryItems={handleLoadInventoryItems}
      onAddItem={hook.addItemToPlan}
      onSave={hook.savePlannedItems}
      onConsume={hook.openConsumeDialog}
      onRetry={hook.refetchAll}
      consumeDialogOpen={hook.consumeDialogOpen}
      consumeDialogItem={hook.consumeDialogItem}
      consumeDialogQuantity={hook.consumeDialogQuantity}
      onConsumeDialogQuantityChange={hook.setConsumeDialogQuantity}
      onConsumeDialogClose={hook.closeConsumeDialog}
      onConsumeConfirm={handleConsumeConfirm}
      canEdit={canEdit}
      canConsume={canConsume}
    />
  );
}

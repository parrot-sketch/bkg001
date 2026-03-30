/**
 * Inventory Planning Tab Container
 * 
 * Orchestration component that wires hook to view.
 */

'use client';

import { useEffect } from 'react';
import { useInventoryPlanningTab } from './useInventoryPlanningTab';
import { InventoryPlanningTabView } from './InventoryPlanningTab.view';
import { InventoryCategory } from '@/domain/enums/InventoryCategory';
import { useAuth } from '@/hooks/patient/useAuth';
import { tokenStorage } from '@/lib/auth/token';
import { useSurgicalCasePlanPage } from '../../shared/hooks/useSurgicalCasePlanPage';
import { OPERATIVE_STATUSES } from '../../core/constants';

interface InventoryPlanningTabContainerProps {
  caseId: string;
}

export function InventoryPlanningTabContainer({
  caseId,
}: InventoryPlanningTabContainerProps) {
  // Get actor user ID and role
  const { user } = useAuth();
  const storedUser = tokenStorage.getUser();
  const actorUserId = user?.id || storedUser?.id || '';
  const actorRole = user?.role || storedUser?.role;

  // Load foundation case data for status and baseline permissions
  const { data: pageData, canEdit: pageCanEdit } = useSurgicalCasePlanPage(caseId);
  const caseStatus = pageData?.case?.status;

  const hook = useInventoryPlanningTab(caseId, actorUserId);

  // Load inventory items when component mounts
  const handleLoadInventoryItems = () => {
    hook.loadInventoryItems([
      InventoryCategory.IMPLANT,
      InventoryCategory.INSTRUMENT,
      InventoryCategory.SUTURE,
      InventoryCategory.DISPOSABLE,
      InventoryCategory.DRESSING,
      InventoryCategory.OTHER
    ]);
  };

  useEffect(() => {
    handleLoadInventoryItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle consume confirm
  const handleConsumeConfirm = async () => {
    if (!hook.consumeDialogItem) return;
    await hook.consumeFromPlan(
      hook.consumeDialogItem.inventoryItemId,
      hook.consumeDialogQuantity,
      actorUserId
    );
  };

  // Permissions
  const isTheaterPersonnel = actorRole === 'THEATER_TECHNICIAN' || actorRole === 'NURSE' || actorRole === 'ADMIN';
  const isOperative = !!caseStatus && OPERATIVE_STATUSES.has(caseStatus);
  
  // Doctors can edit during PLANNING (pageData.canEdit handles this)
  // Theater personnel can consume during OPERATIVE phases
  const canEdit = pageCanEdit ?? true;
  const canConsume = isTheaterPersonnel && isOperative;

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

/**
 * Inventory Tabs Component (DEPRECATED)
 * 
 * This component has been replaced by modular tabs in features/surgical-plan/tabs/.
 * 
 * Legacy wrappers kept for backward compatibility only.
 * All functionality has been migrated to:
 * - InventoryPlanningTabContainer (Planned Items)
 * - UsedItemsTabContainer
 * - BillingSummaryTabContainer
 * - UsageVarianceTabContainer
 * 
 * @deprecated Use the new modular tabs from features/surgical-plan instead.
 */

'use client';

import { InventoryPlanningTabContainer } from '@/features/surgical-plan/tabs/inventory-planning/InventoryPlanningTab.container';
import { UsedItemsTabContainer } from '@/features/surgical-plan/tabs/used-items/UsedItemsTab.container';
import { BillingSummaryTabContainer } from '@/features/surgical-plan/tabs/billing-summary/BillingSummaryTab.container';
import { UsageVarianceTabContainer } from '@/features/surgical-plan/tabs/usage-variance/UsageVarianceTab.container';

interface InventoryTabsProps {
  caseId: string;
}

/**
 * Planned Items Tab (Legacy wrapper)
 * 
 * @deprecated Use InventoryPlanningTabContainer directly from features/surgical-plan
 */
export function PlannedItemsTab({ caseId }: InventoryTabsProps) {
  return <InventoryPlanningTabContainer caseId={caseId} />;
}

/**
 * Used Items Tab (Legacy wrapper)
 * 
 * @deprecated Use UsedItemsTabContainer directly from features/surgical-plan
 */
export function UsedItemsTab({ caseId }: InventoryTabsProps) {
  return <UsedItemsTabContainer caseId={caseId} />;
}

/**
 * Billing Summary Tab (Legacy wrapper)
 * 
 * @deprecated Use BillingSummaryTabContainer directly from features/surgical-plan
 */
export function BillingSummaryTab({ caseId }: InventoryTabsProps) {
  return <BillingSummaryTabContainer caseId={caseId} />;
}

/**
 * Usage Variance Tab (Legacy wrapper)
 * 
 * @deprecated Use UsageVarianceTabContainer directly from features/surgical-plan
 */
export function UsageVarianceTab({ caseId }: InventoryTabsProps) {
  return <UsageVarianceTabContainer caseId={caseId} />;
}

/**
 * Tab Registry
 * 
 * Declarative tab definitions for surgical plan page.
 * Each tab is registered with metadata, permissions, and component.
 */

import {
  FileText,
  Package,
  Stethoscope,
  ShieldAlert,
  Syringe,
  ShoppingCart,
  Receipt,
  TrendingUp,
  Clock,
} from 'lucide-react';
import { Role } from '@/domain/enums/Role';
import type { TabDefinition, SurgicalCasePlanViewModel } from './types';
import { OverviewTabContainer } from '../tabs/overview/OverviewTab.container';
import { ProcedureTabContainer } from '../tabs/procedure/ProcedureTab.container';
import { RiskFactorsTabContainer } from '../tabs/risk-factors/RiskFactorsTab.container';
import { AnesthesiaTabContainer } from '../tabs/anesthesia/AnesthesiaTab.container';
import { InventoryPlanningTabContainer } from '../tabs/inventory-planning/InventoryPlanningTab.container';
import { UsedItemsTabContainer } from '../tabs/used-items/UsedItemsTab.container';
import { BillingSummaryTabContainer } from '../tabs/billing-summary/BillingSummaryTab.container';
import { UsageVarianceTabContainer } from '../tabs/usage-variance/UsageVarianceTab.container';
import { TimelineTabContainer } from '../tabs/timeline/TimelineTab.container';
import { ConsentsTabContainer } from '../tabs/consents/ConsentsTab.container';
import { canEditSurgicalPlan } from './permissions';

/**
 * Tab registry configuration
 * 
 * Phase 2C: Used Items, Billing Summary, Usage Variance, and Timeline tabs extracted and registered.
 * Remaining tabs (Consents, Photos, Team) will be extracted in Phase 2D+.
 */
export const TAB_REGISTRY: TabDefinition[] = [
  {
    key: 'overview',
    label: 'Overview',
    icon: FileText,
    component: OverviewTabContainer,
    order: 0,
  },
  {
    key: 'procedure',
    label: 'Procedure',
    icon: Stethoscope,
    component: ProcedureTabContainer,
    permissionCheck: (role) => canEditSurgicalPlan(role) || role === Role.NURSE,
    order: 1,
  },
  {
    key: 'risk-factors',
    label: 'Risk Factors',
    icon: ShieldAlert,
    component: RiskFactorsTabContainer,
    permissionCheck: (role) => canEditSurgicalPlan(role) || role === Role.NURSE,
    order: 2,
  },
  {
    key: 'anesthesia',
    label: 'Anesthesia',
    icon: Syringe,
    component: AnesthesiaTabContainer,
    permissionCheck: (role) => canEditSurgicalPlan(role) || role === Role.NURSE,
    order: 3,
  },
  {
    key: 'inventory-planning',
    label: 'Planned Items',
    icon: Package,
    component: InventoryPlanningTabContainer,
    permissionCheck: (role) =>
      role === Role.ADMIN || role === Role.NURSE,
    order: 5,
  },
  {
    key: 'used-items',
    label: 'Used Items',
    icon: ShoppingCart,
    component: UsedItemsTabContainer,
    permissionCheck: (role) =>
      role === Role.DOCTOR || role === Role.ADMIN || role === Role.NURSE,
    order: 6,
  },
  {
    key: 'billing-summary',
    label: 'Billing Summary',
    icon: Receipt,
    component: BillingSummaryTabContainer,
    permissionCheck: (role) =>
      role === Role.DOCTOR || role === Role.ADMIN || role === Role.NURSE,
    order: 7,
  },
  {
    key: 'usage-variance',
    label: 'Usage Variance',
    icon: TrendingUp,
    component: UsageVarianceTabContainer,
    permissionCheck: (role) =>
      role === Role.DOCTOR || role === Role.ADMIN || role === Role.NURSE,
    order: 8,
  },
  {
    key: 'timeline',
    label: 'Timeline',
    icon: Clock,
    component: TimelineTabContainer,
    permissionCheck: (role) =>
      role === Role.ADMIN ||
      role === Role.NURSE ||
      role === Role.THEATER_TECHNICIAN,
    order: 9,
  },
  {
    key: 'consents',
    label: 'Consents',
    icon: FileText,
    component: ConsentsTabContainer,
    permissionCheck: (role) => role === Role.DOCTOR || role === Role.ADMIN,
    order: 4, // Between anesthesia and inventory-planning
  },
  // Remaining tabs will be registered in Phase 2E+
  // - photos (PhotosTab)
  // - team (TeamTab)
];

/**
 * Get tabs filtered by role and sorted by order
 * 
 * Phase-aware filtering:
 * - Billing Summary: Only visible in COMPLETED phase
 * - Usage Variance: Only visible in COMPLETED phase
 * - Used Items: Only visible during/after IN_THEATER phase
 */
export function getTabsForRole(
  role: Role,
  data?: SurgicalCasePlanViewModel
): TabDefinition[] {
  const isPostOpPhase = data?.case?.status === 'COMPLETED';
  const isExecutionOrPostOp = ['IN_THEATER', 'COMPLETED'].includes(data?.case?.status || '');
  
  return TAB_REGISTRY.filter((tab) => {
    if (tab.permissionCheck && !tab.permissionCheck(role)) {
      return false;
    }
    
    // Phase-aware filtering
    // Billing Summary only in post-op (COMPLETED)
    if (tab.key === 'billing-summary' && !isPostOpPhase) {
      return false;
    }
    
    // Usage Variance only in post-op (COMPLETED)
    if (tab.key === 'usage-variance' && !isPostOpPhase) {
      return false;
    }
    
    // Used Items only during/after execution (IN_THEATER, COMPLETED)
    if (tab.key === 'used-items' && !isExecutionOrPostOp) {
      return false;
    }
    
    return true;
  }).sort((a, b) => a.order - b.order);
}

/**
 * Get tab by key
 */
export function getTabByKey(key: string): TabDefinition | undefined {
  return TAB_REGISTRY.find((tab) => tab.key === key);
}

/**
 * Surgical Plan Feature Module
 * 
 * Central export point for surgical plan feature.
 */

export { SurgicalPlanShell } from './SurgicalPlanShell';
export { useSurgicalCasePlanPage } from './shared/hooks/useSurgicalCasePlanPage';
export { surgicalPlanApi } from './shared/api/surgicalPlanApi';
export { mapCasePlanDetailDtoToViewModel } from './shared/mappers/surgicalPlanMappers';
export { getTabsForRole, getTabByKey, TAB_REGISTRY } from './core/tabRegistry';
export type { TabDefinition, SurgicalCasePlanViewModel } from './core/types';
export { READINESS_CONFIG, STATUS_CONFIG, OPERATIVE_STATUSES, ANESTHESIA_TYPES } from './core/constants';
export { canViewSurgicalPlan, canEditSurgicalPlan, canMarkCaseReady } from './core/permissions';

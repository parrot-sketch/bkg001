/**
 * Factory: Theater Tech Service Factory
 *
 * Provides a singleton-scoped TheaterTechService instance
 * wired with all repository and service dependencies.
 *
 * Used by API routes to avoid re-instantiating on every request.
 */

import db from '@/lib/db';
import { TheaterTechService } from '@/application/services/TheaterTechService';
import { SurgicalCaseService } from '@/application/services/SurgicalCaseService';
import { PrismaSurgicalCaseRepository } from '@/infrastructure/database/repositories/PrismaSurgicalCaseRepository';
import { PrismaSurgicalChecklistRepository } from '@/infrastructure/database/repositories/PrismaSurgicalChecklistRepository';
import { PrismaClinicalAuditRepository } from '@/infrastructure/database/repositories/PrismaClinicalAuditRepository';
import { PrismaCasePlanRepository } from '@/infrastructure/database/repositories/PrismaCasePlanRepository';
import { TheaterDashboardService } from '@/application/services/TheaterDashboardService';
import { SurgicalChecklistService } from '@/application/services/SurgicalChecklistService';
import { ProcedureTimelineService } from '@/application/services/ProcedureTimelineService';

// Repository instances (singleton per process)
const surgicalCaseRepo = new PrismaSurgicalCaseRepository(db);
const casePlanRepo = new PrismaCasePlanRepository(db);
const checklistRepo = new PrismaSurgicalChecklistRepository(db);
const auditRepo = new PrismaClinicalAuditRepository(db);

// Domain service (with CasePlan repo for readiness validation + DB for form engine checks)
const surgicalCaseService = new SurgicalCaseService(surgicalCaseRepo, casePlanRepo, db);

// Exported for reuse by doctor surgical case API routes
export { surgicalCaseService };
export { surgicalCaseRepo };

// Sub-services
const theaterDashboardService = new TheaterDashboardService(db);
const surgicalChecklistService = new SurgicalChecklistService(db, checklistRepo, auditRepo);
const procedureTimelineService = new ProcedureTimelineService(db, auditRepo);

// Application service
export const theaterTechService = new TheaterTechService(
  db,
  surgicalCaseService,
  checklistRepo,
  auditRepo,
  theaterDashboardService,
  surgicalChecklistService,
  procedureTimelineService
);

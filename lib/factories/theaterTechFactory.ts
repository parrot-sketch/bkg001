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

// Lazy singleton instances
let surgicalCaseRepo: PrismaSurgicalCaseRepository;
let casePlanRepo: PrismaCasePlanRepository;
let checklistRepo: PrismaSurgicalChecklistRepository;
let auditRepo: PrismaClinicalAuditRepository;
let surgicalCaseService: SurgicalCaseService;
let theaterDashboardService: TheaterDashboardService;
let surgicalChecklistService: SurgicalChecklistService;
let procedureTimelineService: ProcedureTimelineService;
let theaterTechService: TheaterTechService;

function initialize() {
  if (theaterTechService) return;

  surgicalCaseRepo = new PrismaSurgicalCaseRepository(db);
  casePlanRepo = new PrismaCasePlanRepository(db);
  checklistRepo = new PrismaSurgicalChecklistRepository(db);
  auditRepo = new PrismaClinicalAuditRepository(db);

  surgicalCaseService = new SurgicalCaseService(surgicalCaseRepo, casePlanRepo, db);

  theaterDashboardService = new TheaterDashboardService(db);
  surgicalChecklistService = new SurgicalChecklistService(db, checklistRepo, auditRepo);
  procedureTimelineService = new ProcedureTimelineService(db, auditRepo);

  theaterTechService = new TheaterTechService(
    db,
    surgicalCaseService,
    checklistRepo,
    auditRepo,
    theaterDashboardService,
    surgicalChecklistService,
    procedureTimelineService
  );
}

export function getSurgicalCaseService() {
  initialize();
  return surgicalCaseService;
}

export function getTheaterTechService() {
  initialize();
  return theaterTechService;
}

export function getSurgicalCaseRepo() {
  initialize();
  return surgicalCaseRepo;
}

export function getSurgicalChecklistRepo() {
  initialize();
  return checklistRepo;
}

export function getAuditRepo() {
  initialize();
  return auditRepo;
}

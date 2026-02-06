import { CasePlan, CaseReadinessStatus } from '@prisma/client';
import { CreateCasePlanDto } from '@/application/dtos/CreateCasePlanDto';

/**
 * Repository Interface: ICasePlanRepository
 *
 * Defines the contract for case plan data persistence operations.
 * Case plans contain surgical planning details, pre-op notes, and
 * readiness tracking for surgical cases.
 */
export interface ICasePlanRepository {
  /**
   * Save or update a case plan
   */
  save(casePlan: CreateCasePlanDto): Promise<CasePlan>;

  /**
   * Find a case plan by appointment ID (legacy link)
   */
  findByAppointmentId(appointmentId: number): Promise<CasePlan | null>;

  /**
   * Find a case plan by surgical case ID (new architecture)
   */
  findBySurgicalCaseId(surgicalCaseId: string): Promise<CasePlan | null>;

  /**
   * Find a case plan by ID
   */
  findById(id: number): Promise<CasePlan | null>;

  /**
   * Find case plans by readiness status (for nurse dashboard)
   */
  findByReadinessStatus(status: CaseReadinessStatus): Promise<CasePlan[]>;

  /**
   * Find all case plans pending readiness work
   * Returns case plans that are NOT_STARTED or IN_PROGRESS
   */
  findPendingReadiness(): Promise<CasePlan[]>;

  /**
   * Update case plan readiness status
   */
  updateReadinessStatus(id: number, status: CaseReadinessStatus): Promise<CasePlan>;

  /**
   * Link case plan to surgical case
   */
  linkToSurgicalCase(casePlanId: number, surgicalCaseId: string): Promise<CasePlan>;
}

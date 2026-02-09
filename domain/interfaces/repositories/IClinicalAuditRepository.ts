import { ClinicalAuditEvent } from '@prisma/client';

/**
 * Repository Interface: IClinicalAuditRepository
 *
 * Defines the contract for clinical audit event persistence.
 * Audit events are immutable — once written they cannot be modified or deleted.
 *
 * Used for tracking all clinical actions: case transitions, checklist completions,
 * timestamp captures, and authorization overrides.
 */
export interface IClinicalAuditRepository {
  /**
   * Record a new audit event. Returns the created event.
   */
  record(event: CreateClinicalAuditEventDto): Promise<ClinicalAuditEvent>;

  /**
   * Find audit events for a specific entity.
   * Ordered by created_at descending (newest first).
   */
  findByEntity(entityType: string, entityId: string): Promise<ClinicalAuditEvent[]>;

  /**
   * Find audit events by actor (user).
   * Ordered by created_at descending.
   */
  findByActor(actorUserId: string, limit?: number): Promise<ClinicalAuditEvent[]>;
}

/**
 * DTO for creating a clinical audit event.
 */
export interface CreateClinicalAuditEventDto {
  actorUserId: string;
  actionType: string;
  entityType: string;
  entityId: string;
  metadata?: Record<string, unknown>;
}

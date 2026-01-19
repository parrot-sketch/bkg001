/**
 * Service Interface: IAuditService
 * 
 * Defines the contract for recording audit events in the system.
 * This interface represents the "port" in Ports and Adapters architecture.
 * 
 * Audit events are critical for healthcare systems to maintain compliance
 * with regulations such as HIPAA, which require tracking all access to
 * patient information and system changes.
 * 
 * Implementations of this interface will be provided by the infrastructure layer
 * (e.g., PrismaAuditService using Prisma ORM to write to audit log table).
 * 
 * Domain Layer Rule: This interface only depends on domain types.
 * No framework, infrastructure, or external dependencies allowed.
 */
export interface IAuditService {
  /**
   * Records an audit event
   * 
   * This method should record who performed what action on which record.
   * The implementation should ensure that audit events are immutable and
   * cannot be deleted or modified after creation.
   * 
   * @param event - The audit event to record
   * @returns Promise that resolves when the audit event is recorded
   * @throws Error if the audit event cannot be recorded
   */
  recordEvent(event: AuditEvent): Promise<void>;
}

/**
 * Audit Event
 * 
 * Represents a single audit event to be recorded.
 * This is a domain concept and should be a value object or DTO.
 */
export interface AuditEvent {
  /**
   * The user ID who performed the action
   */
  readonly userId: string;

  /**
   * The ID of the record that was accessed or modified
   */
  readonly recordId: string;

  /**
   * The action that was performed (e.g., "CREATE", "UPDATE", "DELETE", "VIEW")
   */
  readonly action: string;

  /**
   * The model/entity type that was affected (e.g., "Patient", "Appointment")
   */
  readonly model: string;

  /**
   * Optional additional details about the event
   */
  readonly details?: string;

  /**
   * Optional IP address of the user
   */
  readonly ipAddress?: string;

  /**
   * Optional session ID for tracking user sessions
   */
  readonly sessionId?: string;
}

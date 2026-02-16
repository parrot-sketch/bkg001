import { SurgicalCase, SurgicalCaseStatus, SurgicalUrgency, SurgicalRole } from '@prisma/client';

/**
 * Repository Interface: ISurgicalCaseRepository
 *
 * Defines the contract for surgical case data persistence operations.
 * Surgical cases track patients through the surgery workflow from
 * consultation outcome to post-operative follow-up.
 */
export interface ISurgicalCaseRepository {
  /**
   * Find a surgical case by its unique identifier
   */
  findById(id: string): Promise<SurgicalCase | null>;

  /**
   * Find all surgical cases for a patient
   */
  findByPatientId(patientId: string): Promise<SurgicalCase[]>;

  /**
   * Find a surgical case by its originating consultation ID
   */
  findByConsultationId(consultationId: number): Promise<SurgicalCase | null>;

  /**
   * Find surgical cases by status (for dashboards)
   */
  findByStatus(status: SurgicalCaseStatus): Promise<SurgicalCase[]>;

  /**
   * Find all surgical cases for a specific surgeon
   */
  findBySurgeonId(surgeonId: string): Promise<SurgicalCase[]>;

  /**
   * Find surgical cases that are ready for scheduling (for admin theater booking)
   * Returns cases in READY_FOR_SCHEDULING status with full relations
   */
  findReadyForScheduling(): Promise<SurgicalCase[]>;

  /**
   * Find surgical cases pending pre-op readiness (for nurse dashboard)
   * Returns cases in DRAFT or PLANNING status that need readiness work
   */
  findPendingPreOp(): Promise<SurgicalCase[]>;

  /**
   * Create a new surgical case
   */
  create(data: {
    patientId: string;
    primarySurgeonId: string;
    consultationId?: number;
    appointmentId?: number;
    urgency?: SurgicalUrgency;
    diagnosis?: string;
    procedureName?: string;
    createdBy?: string;
  }): Promise<SurgicalCase>;

  /**
   * Update surgical case status
   */
  updateStatus(id: string, status: SurgicalCaseStatus): Promise<SurgicalCase>;

  /**
   * Update surgical case fields
   */
  update(id: string, data: Partial<SurgicalCase>): Promise<SurgicalCase>;

  /**
   * Add a staff member to the surgical procedure record
   */
  addStaff(data: {
    procedureRecordId: number;
    userId: string;
    role: SurgicalRole;
  }): Promise<void>;
}

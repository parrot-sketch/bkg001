/**
 * Doctor-Patient Assignment Repository Interface
 * 
 * Defines the contract for data access operations related to doctor-patient
 * assignments. Implementations should handle the persistence layer interaction.
 * 
 * This interface allows for:
 * - Dependency injection (test mocks, different implementations)
 * - Separation of concerns (domain logic from persistence)
 * - Clean architecture boundaries
 */

import type { DoctorPatientAssignmentStatusDto } from '@/application/dtos/DoctorPatientAssignmentDto';

/**
 * Raw domain model from database
 * More detailed than DTO, includes all fields
 */
export interface DoctorPatientAssignmentModel {
  id: string;
  doctorId: string;
  patientId: string;
  status: DoctorPatientAssignmentStatusDto;
  assignedAt: Date;
  dischargedAt: Date | null;
  transferredAt: Date | null;
  transferredToDoctorId: string | null;
  transferReason: string | null;
  careNotes: string | null;
  dischargeSummary: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Query options for flexible list retrieval
 */
export interface AssignmentQueryOptions {
  status?: DoctorPatientAssignmentStatusDto;
  skip?: number;
  take?: number;
  orderBy?: 'assignedAt' | 'name' | 'recent';
  orderDirection?: 'asc' | 'desc';
}

/**
 * Repository interface for Doctor-Patient Assignment operations
 * 
 * All methods should:
 * - Throw meaningful errors
 *   - `NotFoundError` for missing resources
 *   - `ConflictError` for duplicate/constraint violations
 *   - `ValidationError` for invalid inputs
 *   - `AuthorizationError` for permission issues
 * - Include proper logging
 * - Be idempotent where applicable
 */
export interface IDoctorPatientAssignmentRepository {
  /**
   * Create a new assignment
   * 
   * @throws ConflictError if assignment already exists for this doctor-patient pair
   */
  create(assignment: Omit<DoctorPatientAssignmentModel, 'id' | 'createdAt' | 'updatedAt'>): Promise<DoctorPatientAssignmentModel>;

  /**
   * Get assignment by doctor ID and patient ID
   * 
   * @throws NotFoundError if assignment doesn't exist
   */
  findByDoctorAndPatient(doctorId: string, patientId: string): Promise<DoctorPatientAssignmentModel>;

  /**
   * Get assignment by ID
   * 
   * @throws NotFoundError if assignment doesn't exist
   */
  findById(assignmentId: string): Promise<DoctorPatientAssignmentModel>;

  /**
   * List all assignments for a doctor (filtered by status, sorted, paginated)
   * 
   * Returns empty array if no matches found
   */
  listByDoctorId(
    doctorId: string,
    options?: AssignmentQueryOptions
  ): Promise<{
    data: DoctorPatientAssignmentModel[];
    total: number;
  }>;

  /**
   * List all assignments for a patient
   * 
   * Used to find which doctor(s) have active assignment(s) for a patient
   */
  listByPatientId(
    patientId: string,
    options?: Partial<Omit<AssignmentQueryOptions, 'status'>>
  ): Promise<DoctorPatientAssignmentModel[]>;

  /**
   * Update assignment status and metadata
   * 
   * @throws NotFoundError if assignment doesn't exist
   */
  update(assignmentId: string, updates: Partial<DoctorPatientAssignmentModel>): Promise<DoctorPatientAssignmentModel>;

  /**
   * Discharge a patient (sets status=DISCHARGED, discharged_at=now)
   * 
   * @throws NotFoundError if assignment doesn't exist
   */
  discharge(assignmentId: string, dischargeSummary: string): Promise<DoctorPatientAssignmentModel>;

  /**
   * Transfer patient to another doctor
   * 
   * Creates TRANSFERRED record for old doctor, creates new ACTIVE record for new doctor
   * 
   * @throws NotFoundError if assignment doesn't exist
   * @throws ValidationError if target doctor ID is invalid
   */
  transfer(
    assignmentId: string,
    transferToDoctorId: string,
    transferReason: string
  ): Promise<{ oldAssignment: DoctorPatientAssignmentModel; newAssignment: DoctorPatientAssignmentModel }>;

  /**
   * Mark assignment as inactive (temporary pause, e.g., doctor on leave)
   * 
   * Does NOT create a new assignment - patient can be "re-activated" without creating new record
   */
  deactivate(assignmentId: string, reason?: string): Promise<DoctorPatientAssignmentModel>;

  /**
   * Reactivate an inactive assignment
   * 
   * @throws NotFoundError if assignment doesn't exist
   * @throws ValidationError if assignment is not INACTIVE status
   */
  reactivate(assignmentId: string): Promise<DoctorPatientAssignmentModel>;

  /**
   * Delete assignment completely
   * 
   * Used for cleaning up orphaned or erroneous assignments
   * Generally should not be used in normal workflows - use discharge() instead
   */
  delete(assignmentId: string): Promise<void>;

  /**
   * Check if doctor has active assignment with patient
   * 
   * Returns true if status=ACTIVE, false otherwise
   */
  isActivelyManaging(doctorId: string, patientId: string): Promise<boolean>;

  /**
   * Count active patients for a doctor
   * 
   * Useful for dashboard stats, roster size checks
   */
  countActivePatients(doctorId: string): Promise<number>;
}

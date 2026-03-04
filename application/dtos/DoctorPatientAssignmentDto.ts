/**
 * Doctor-Patient Assignment DTOs
 * 
 * Data transfer objects for managing doctor-patient care assignments,
 * including explicit creation, discharge, and transfer workflows.
 */

/**
 * Request DTO: Assign patient to doctor
 * 
 * Used when a doctor explicitly accepts a patient into their care.
 * This creates an explicit assignment record separate from appointments.
 */
export interface CreateAssignmentRequest {
  patientId: string;
  careNotes?: string; // Optional initial notes about the care relationship
}

/**
 * Request DTO: Discharge patient from care
 * 
 * Used when doctor formally ends the care relationship
 * (e.g., treatment is complete, patient is stable for discharge).
 */
export interface DischargePatientRequest {
  dischargeSummary: string; // Clinical summary of care provided
  dischargeNotes?: string;  // Additional discharge instructions/notes
}

/**
 * Request DTO: Transfer patient to another doctor
 * 
 * Used when care responsibility is being moved to another doctor
 * (e.g., specialist referral, second opinion, change of doctor).
 */
export interface TransferPatientRequest {
  transferToDoctorId: string;    // Doctor ID who will take over care
  transferReason: string;        // Reason for transfer (referral, specialist, etc.)
  transferNotes?: string;        // Additional notes about the transfer
}

/**
 * Request DTO: Update assignment status/metadata
 * 
 * Used for updating care notes or status along care relationship.
 */
export interface UpdateAssignmentRequest {
  status?: DoctorPatientAssignmentStatusDto;
  careNotes?: string;
}

/**
 * Response DTO: Doctor-Patient Assignment
 * 
 * Full representation of a doctor-patient care assignment
 * with all lifecycle metadata.
 */
export interface DoctorPatientAssignmentDto {
  // Identity
  id: string;
  doctorId: string;
  patientId: string;

  // Status
  status: DoctorPatientAssignmentStatusDto;

  // Care lifecycle
  assignedAt: string;      // ISO timestamp
  dischargedAt?: string;   // ISO timestamp (null if not discharged)
  transferredAt?: string;  // ISO timestamp (null if not transferred)

  // Transfer info (only populated if status = TRANSFERRED)
  transferredToDoctorId?: string;
  transferReason?: string;

  // Metadata
  careNotes?: string;
  dischargeSummary?: string;

  // Audit timestamps
  createdAt: string;
  updatedAt: string;
}

/**
 * Enum: Doctor-Patient Assignment Status
 * 
 * ACTIVE: Patient is currently under doctor's care
 * DISCHARGED: Care relationship ended, patient is discharged
 * TRANSFERRED: Care transferred to another doctor
 * INACTIVE: Care temporarily paused (e.g., doctor on leave, awaiting decision)
 */
export enum DoctorPatientAssignmentStatusDto {
  ACTIVE = 'ACTIVE',
  DISCHARGED = 'DISCHARGED',
  TRANSFERRED = 'TRANSFERRED',
  INACTIVE = 'INACTIVE',
}

/**
 * Query DTO: List assignments filter parameters
 * 
 * Used for filtering doctor's patient list with various criteria.
 */
export interface ListAssignmentsQuery {
  status?: DoctorPatientAssignmentStatusDto;  // Filter by status (default: ACTIVE)
  skip?: number;                              // Pagination offset
  take?: number;                              // Pagination limit
  sortBy?: 'assignedAt' | 'name' | 'recent'; // Sort field
  sortOrder?: 'asc' | 'desc';                 // Sort direction
}

/**
 * Response DTO: Paginated list of assignments
 * 
 * For /doctor/me/patients type endpoints
 */
export interface ListAssignmentsResponse {
  data: DoctorPatientAssignmentDto[];
  total: number;     // Total matching records
  page: number;      // Current page (0-indexed)
  pageSize: number;  // Records per page
  hasMore: boolean;  // Whether there are more pages
}

/**
 * Response DTO: Assignment operation result
 * 
 * Standard response for create/update/delete operations
 */
export interface AssignmentOperationResponse {
  success: boolean;
  message: string;
  data?: DoctorPatientAssignmentDto;
  error?: string;
}

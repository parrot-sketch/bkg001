/**
 * Doctor-Patient Assignment Service
 * 
 * Application use case layer for managing doctor-patient care assignments.
 * Implements business logic, validation, and orchestration.
 * 
 * Design principles:
 * - Single responsibility: manage patient assignment lifecycle
 * - Dependency injection: takes repository as constructor parameter
 * - Clean error handling: meaningful error messages
 * - Audit trail: logs all significant actions
 * - Idempotency: where applicable (e.g., repeated discharge of same patient)
 */

import type { IDoctorPatientAssignmentRepository } from '@/domain/repositories/IDoctorPatientAssignmentRepository';
import type {
  DoctorPatientAssignmentDto,
  CreateAssignmentRequest,
  DischargePatientRequest,
  TransferPatientRequest,
  UpdateAssignmentRequest,
  ListAssignmentsQuery,
} from '@/application/dtos/DoctorPatientAssignmentDto';
import { DoctorPatientAssignmentStatusDto } from '@/application/dtos/DoctorPatientAssignmentDto';
import db from '@/lib/db';

/**
 * Service/Use Case: Doctor-Patient Assignment Management
 * 
 * Handles all business operations related to assigning and managing patients
 * under doctors' care, including discharge and transfer workflows.
 */
export class DoctorPatientAssignmentService {
  constructor(private repository: IDoctorPatientAssignmentRepository) {}

  /**
   * Map domain model to DTO
   */
  private toDto(model: any): DoctorPatientAssignmentDto {
    return {
      id: model.id,
      doctorId: model.doctorId,
      patientId: model.patientId,
      status: model.status,
      assignedAt: model.assignedAt.toISOString(),
      dischargedAt: model.dischargedAt?.toISOString(),
      transferredAt: model.transferredAt?.toISOString(),
      transferredToDoctorId: model.transferredToDoctorId,
      transferReason: model.transferReason,
      careNotes: model.careNotes,
      dischargeSummary: model.dischargeSummary,
      createdAt: model.createdAt.toISOString(),
      updatedAt: model.updatedAt.toISOString(),
    };
  }

  /**
   * Assign a patient to doctor's active care
   * 
   * This creates an explicit assignment record indicating the patient is under
   * this doctor's care. If an assignment already exists for this doctor-patient
   * pair, it reactivates it (moves from INACTIVE → ACTIVE if applicable).
   * 
   * @throws Error if validation fails
   */
  async assignPatient(doctorId: string, request: CreateAssignmentRequest): Promise<DoctorPatientAssignmentDto> {
    // Validate inputs
    if (!doctorId?.trim()) throw new Error('Doctor ID is required');
    if (!request.patientId?.trim()) throw new Error('Patient ID is required');

    // Verify doctor exists
    const doctor = await db.doctor.findUnique({
      where: { id: doctorId },
      select: { id: true, name: true },
    });
    if (!doctor) throw new Error(`Doctor not found: ${doctorId}`);

    // Verify patient exists
    const patient = await db.patient.findUnique({
      where: { id: request.patientId },
      select: { id: true, first_name: true, last_name: true },
    });
    if (!patient) throw new Error(`Patient not found: ${request.patientId}`);

    // Check if assignment already exists
    let existingAssignment = null;
    try {
      existingAssignment = await this.repository.findByDoctorAndPatient(doctorId, request.patientId);
    } catch (error) {
      // Not found is expected, continue
    }

    // If exists and is ACTIVE, return existing
    if (existingAssignment && existingAssignment.status === DoctorPatientAssignmentStatusDto.ACTIVE) {
      console.log(`[Service] Assignment already active: ${doctorId} → ${request.patientId}`);
      return this.toDto(existingAssignment);
    }

    // If exists and is INACTIVE, reactivate it
    if (existingAssignment && existingAssignment.status === DoctorPatientAssignmentStatusDto.INACTIVE) {
      console.log(`[Service] Reactivating inactive assignment: ${existingAssignment.id}`);
      const reactivated = await this.repository.reactivate(existingAssignment.id);
      return this.toDto(reactivated);
    }

    // Create new assignment
    const assignment = await this.repository.create({
      doctorId,
      patientId: request.patientId,
      status: DoctorPatientAssignmentStatusDto.ACTIVE,
      assignedAt: new Date(),
      dischargedAt: null,
      transferredAt: null,
      transferredToDoctorId: null,
      transferReason: null,
      careNotes: request.careNotes || null,
      dischargeSummary: null,
    });

    console.log(`[Service] Assigned patient ${patient.first_name} ${patient.last_name} to ${doctor.name}`);
    return this.toDto(assignment);
  }

  /**
   * Get all active patients for a doctor
   * 
   * By default returns patients with ACTIVE status, but can be filtered.
   */
  async getPatientsByDoctor(doctorId: string, query?: ListAssignmentsQuery): Promise<any> {
    if (!doctorId?.trim()) throw new Error('Doctor ID is required');

    // Default to ACTIVE status if not specified
    const status = query?.status || DoctorPatientAssignmentStatusDto.ACTIVE;
    const skip = query?.skip || 0;
    const take = query?.take || 50;

    const { data, total } = await this.repository.listByDoctorId(doctorId, {
      status,
      skip,
      take,
      orderBy: query?.sortBy || 'assignedAt',
      orderDirection: query?.sortOrder || 'desc',
    });

    return {
      data: data.map((item) => this.toDto(item)),
      total,
      page: Math.floor(skip / take),
      pageSize: take,
      hasMore: skip + take < total,
    };
  }

  /**
   * Discharge patient from care
   * 
   * Formally ends the care relationship. Sets status to DISCHARGED and
   * records a discharge summary for the medical record.
   * 
   * @throws Error if assignment not found
   */
  async dischargePatient(assignmentId: string, request: DischargePatientRequest): Promise<DoctorPatientAssignmentDto> {
    if (!assignmentId?.trim()) throw new Error('Assignment ID is required');
    if (!request.dischargeSummary?.trim()) throw new Error('Discharge summary is required');

    const assignment = await this.repository.discharge(assignmentId, request.dischargeSummary);
    
    console.log(`[Service] Discharged assignment: ${assignmentId}`);
    return this.toDto(assignment);
  }

  /**
   * Transfer patient to another doctor
   * 
   * Moves care responsibility from current doctor to new doctor.
   * Creates TRANSFERRED record for old doctor and new ACTIVE record for new doctor.
   * 
   * @throws Error if assignment or target doctor not found
   */
  async transferPatient(assignmentId: string, request: TransferPatientRequest): Promise<any> {
    if (!assignmentId?.trim()) throw new Error('Assignment ID is required');
    if (!request.transferToDoctorId?.trim()) throw new Error('Target doctor ID is required');
    if (!request.transferReason?.trim()) throw new Error('Transfer reason is required');

    const { oldAssignment, newAssignment } = await this.repository.transfer(
      assignmentId,
      request.transferToDoctorId,
      request.transferReason
    );

    // Get doctor and patient details for logging
    const sourceDoctorId = oldAssignment.doctorId;
    const targetDoctorId = newAssignment.doctorId;
    const patientId = oldAssignment.patientId;

    console.log(
      `[Service] Transferred patient ${patientId} from doctor ${sourceDoctorId} to ${targetDoctorId}`
    );

    return {
      oldAssignment: this.toDto(oldAssignment),
      newAssignment: this.toDto(newAssignment),
    };
  }

  /**
   * Update assignment metadata (care notes, etc.)
   * 
   * Does NOT change assignment status - use specific methods (discharge, transfer, etc.)
   */
  async updateAssignment(assignmentId: string, request: UpdateAssignmentRequest): Promise<DoctorPatientAssignmentDto> {
    if (!assignmentId?.trim()) throw new Error('Assignment ID is required');

    const updates: any = {};
    if (request.careNotes !== undefined) updates.careNotes = request.careNotes;
    if (request.status !== undefined) updates.status = request.status;

    const assignment = await this.repository.update(assignmentId, updates);

    console.log(`[Service] Updated assignment: ${assignmentId}`);
    return this.toDto(assignment);
  }

  /**
   * Check if doctor is actively managing patient
   * 
   * Returns true only if assignment exists AND status is ACTIVE
   */
  async isActivelyManaging(doctorId: string, patientId: string): Promise<boolean> {
    return this.repository.isActivelyManaging(doctorId, patientId);
  }

  /**
   * Get count of active patients for a doctor
   * 
   * Useful for dashboard stats, capacity checks
   */
  async getActivePatientCount(doctorId: string): Promise<number> {
    if (!doctorId?.trim()) throw new Error('Doctor ID is required');
    return this.repository.countActivePatients(doctorId);
  }

  /**
   * Get all assignments (any status) for a patient
   * 
   * Shows full history of which doctors have/had care of this patient
   */
  async getAssignmentHistoryForPatient(patientId: string): Promise<DoctorPatientAssignmentDto[]> {
    if (!patientId?.trim()) throw new Error('Patient ID is required');

    const assignments = await this.repository.listByPatientId(patientId);
    return assignments.map((a) => this.toDto(a));
  }
}

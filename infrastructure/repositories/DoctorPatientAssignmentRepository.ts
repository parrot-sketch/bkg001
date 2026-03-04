/**
 * Doctor-Patient Assignment Repository Implementation
 * 
 * Prisma-based implementation of the assignment repository interface.
 * Handles all database queries and transactions.
 * 
 * Design principles:
 * - Single responsibility: persist/retrieve assignment data only
 * - No business logic beyond data access
 * - Clear error handling with domain-level exceptions
 * - Logging for all operations for auditability
 */

import db from '@/lib/db';
import type {
  IDoctorPatientAssignmentRepository,
  DoctorPatientAssignmentModel,
  AssignmentQueryOptions,
} from '@/domain/repositories/IDoctorPatientAssignmentRepository';
import type { DoctorPatientAssignmentStatusDto } from '@/application/dtos/DoctorPatientAssignmentDto';
import { DoctorPatientAssignmentStatusDto as StatusEnum } from '@/application/dtos/DoctorPatientAssignmentDto';

// Custom errors
class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}

class ConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConflictError';
  }
}

class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

/**
 * Prisma-based implementation of IDoctorPatientAssignmentRepository
 */
export class DoctorPatientAssignmentRepository implements IDoctorPatientAssignmentRepository {
  /**
   * Convert Prisma model to domain model
   */
  private toDomainModel(prismaModel: any): DoctorPatientAssignmentModel {
    return {
      id: prismaModel.id,
      doctorId: prismaModel.doctor_id,
      patientId: prismaModel.patient_id,
      status: prismaModel.status as DoctorPatientAssignmentStatusDto,
      assignedAt: prismaModel.assigned_at,
      dischargedAt: prismaModel.discharged_at,
      transferredAt: prismaModel.transferred_at,
      transferredToDoctorId: prismaModel.transferred_to_doctor_id,
      transferReason: prismaModel.transfer_reason,
      careNotes: prismaModel.care_notes,
      dischargeSummary: prismaModel.discharge_summary,
      createdAt: prismaModel.created_at,
      updatedAt: prismaModel.updated_at,
    };
  }

  /**
   * Convert domain model to Prisma create input
   */
  private toPrismaCreateInput(model: Omit<DoctorPatientAssignmentModel, 'id' | 'createdAt' | 'updatedAt'>) {
    return {
      doctor_id: model.doctorId,
      patient_id: model.patientId,
      status: model.status,
      assigned_at: model.assignedAt,
      discharged_at: model.dischargedAt,
      transferred_at: model.transferredAt,
      transferred_to_doctor_id: model.transferredToDoctorId,
      transfer_reason: model.transferReason,
      care_notes: model.careNotes,
      discharge_summary: model.dischargeSummary,
    };
  }

  async create(assignment: Omit<DoctorPatientAssignmentModel, 'id' | 'createdAt' | 'updatedAt'>): Promise<DoctorPatientAssignmentModel> {
    try {
      const existing = await db.doctorPatientAssignment.findUnique({
        where: {
          doctor_id_patient_id: {
            doctor_id: assignment.doctorId,
            patient_id: assignment.patientId,
          },
        },
      });

      if (existing) {
        throw new ConflictError(
          `Assignment already exists for doctor ${assignment.doctorId} and patient ${assignment.patientId}`
        );
      }

      const created = await db.doctorPatientAssignment.create({
        data: this.toPrismaCreateInput(assignment),
      });

      console.log(`[Repo] Created assignment: ${created.id} (doctor: ${assignment.doctorId}, patient: ${assignment.patientId})`);
      return this.toDomainModel(created);
    } catch (error) {
      if (error instanceof ConflictError) throw error;
      console.error('[Repo] Error creating assignment:', error);
      throw new Error(`Failed to create assignment: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async findByDoctorAndPatient(doctorId: string, patientId: string): Promise<DoctorPatientAssignmentModel> {
    try {
      const assignment = await db.doctorPatientAssignment.findUnique({
        where: {
          doctor_id_patient_id: {
            doctor_id: doctorId,
            patient_id: patientId,
          },
        },
      });

      if (!assignment) {
        throw new NotFoundError(`Assignment not found for doctor ${doctorId} and patient ${patientId}`);
      }

      return this.toDomainModel(assignment);
    } catch (error) {
      if (error instanceof NotFoundError) throw error;
      console.error('[Repo] Error finding assignment:', error);
      throw new Error(`Failed to find assignment: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async findById(assignmentId: string): Promise<DoctorPatientAssignmentModel> {
    try {
      const assignment = await db.doctorPatientAssignment.findUnique({
        where: { id: assignmentId },
      });

      if (!assignment) {
        throw new NotFoundError(`Assignment not found with ID ${assignmentId}`);
      }

      return this.toDomainModel(assignment);
    } catch (error) {
      if (error instanceof NotFoundError) throw error;
      console.error('[Repo] Error finding assignment by ID:', error);
      throw new Error(`Failed to find assignment: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async listByDoctorId(
    doctorId: string,
    options?: AssignmentQueryOptions
  ): Promise<{ data: DoctorPatientAssignmentModel[]; total: number }> {
    try {
      const where: any = { doctor_id: doctorId };

      // Filter by status if provided (default to ACTIVE)
      if (options?.status) {
        where.status = options.status;
      } else {
        where.status = StatusEnum.ACTIVE;
      }

      // Execute count query for total
      const total = await db.doctorPatientAssignment.count({ where });

      // Determine order
      const orderBy: any = {};
      const field = options?.orderBy || 'assignedAt';
      const direction = options?.orderDirection || 'desc';

      if (field === 'assignedAt') {
        orderBy.assigned_at = direction;
      } else if (field === 'recent') {
        orderBy.assigned_at = direction;
      } else if (field === 'name') {
        // Join patient table for name sorting
        // For now, default to assigned_at
        orderBy.assigned_at = direction;
      }

      // Fetch assignments with pagination
      const assignments = await db.doctorPatientAssignment.findMany({
        where,
        orderBy,
        skip: options?.skip || 0,
        take: options?.take || 50,
      });

      return {
        data: assignments.map((a) => this.toDomainModel(a)),
        total,
      };
    } catch (error) {
      console.error('[Repo] Error listing assignments:', error);
      throw new Error(`Failed to list assignments: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async listByPatientId(
    patientId: string,
    options?: Partial<Omit<AssignmentQueryOptions, 'status'>>
  ): Promise<DoctorPatientAssignmentModel[]> {
    try {
      const where: any = { patient_id: patientId };

      const assignments = await db.doctorPatientAssignment.findMany({
        where,
        orderBy: { assigned_at: 'desc' },
        skip: options?.skip || 0,
        take: options?.take || 50,
      });

      return assignments.map((a) => this.toDomainModel(a));
    } catch (error) {
      console.error('[Repo] Error listing patient assignments:', error);
      throw new Error(`Failed to list assignments: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async update(assignmentId: string, updates: Partial<DoctorPatientAssignmentModel>): Promise<DoctorPatientAssignmentModel> {
    try {
      const updateData: any = {};

      if (updates.status !== undefined) updateData.status = updates.status;
      if (updates.careNotes !== undefined) updateData.care_notes = updates.careNotes;
      if (updates.dischargeSummary !== undefined) updateData.discharge_summary = updates.dischargeSummary;

      const updated = await db.doctorPatientAssignment.update({
        where: { id: assignmentId },
        data: updateData,
      });

      console.log(`[Repo] Updated assignment: ${assignmentId}`);
      return this.toDomainModel(updated);
    } catch (error: any) {
      if (error.code === 'P2025') {
        throw new NotFoundError(`Assignment not found with ID ${assignmentId}`);
      }
      console.error('[Repo] Error updating assignment:', error);
      throw new Error(`Failed to update assignment: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async discharge(assignmentId: string, dischargeSummary: string): Promise<DoctorPatientAssignmentModel> {
    try {
      const updated = await db.doctorPatientAssignment.update({
        where: { id: assignmentId },
        data: {
          status: StatusEnum.DISCHARGED,
          discharged_at: new Date(),
          discharge_summary: dischargeSummary,
        },
      });

      console.log(`[Repo] Discharged patient from assignment: ${assignmentId}`);
      return this.toDomainModel(updated);
    } catch (error: any) {
      if (error.code === 'P2025') {
        throw new NotFoundError(`Assignment not found with ID ${assignmentId}`);
      }
      console.error('[Repo] Error discharging patient:', error);
      throw new Error(`Failed to discharge patient: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async transfer(
    assignmentId: string,
    transferToDoctorId: string,
    transferReason: string
  ): Promise<{ oldAssignment: DoctorPatientAssignmentModel; newAssignment: DoctorPatientAssignmentModel }> {
    try {
      // Verify target doctor exists
      const targetDoctor = await db.doctor.findUnique({
        where: { id: transferToDoctorId },
        select: { id: true },
      });

      if (!targetDoctor) {
        throw new ValidationError(`Target doctor not found: ${transferToDoctorId}`);
      }

      // Get original assignment
      const original = await db.doctorPatientAssignment.findUnique({
        where: { id: assignmentId },
        select: {
          id: true,
          doctor_id: true,
          patient_id: true,
        },
      });

      if (!original) {
        throw new NotFoundError(`Assignment not found with ID ${assignmentId}`);
      }

      // Start transaction: update old, create new
      const result = await db.$transaction(async (tx) => {
        // Mark old assignment as TRANSFERRED
        const oldAssignment = await tx.doctorPatientAssignment.update({
          where: { id: assignmentId },
          data: {
            status: StatusEnum.TRANSFERRED,
            transferred_at: new Date(),
            transferred_to_doctor_id: transferToDoctorId,
            transfer_reason: transferReason,
          },
        });

        // Create new ACTIVE assignment for target doctor
        const newAssignment = await tx.doctorPatientAssignment.create({
          data: {
            doctor_id: transferToDoctorId,
            patient_id: original.patient_id,
            status: StatusEnum.ACTIVE,
            assigned_at: new Date(),
            transfer_reason: `Transferred from ${original.doctor_id}: ${transferReason}`,
          },
        });

        return {
          oldAssignment: this.toDomainModel(oldAssignment),
          newAssignment: this.toDomainModel(newAssignment),
        };
      });

      console.log(
        `[Repo] Transferred patient: ${original.patient_id} from doctor ${original.doctor_id} to ${transferToDoctorId}`
      );
      return result;
    } catch (error) {
      if (error instanceof ValidationError || error instanceof NotFoundError) throw error;
      console.error('[Repo] Error transferring patient:', error);
      throw new Error(`Failed to transfer patient: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async deactivate(assignmentId: string, reason?: string): Promise<DoctorPatientAssignmentModel> {
    try {
      const updated = await db.doctorPatientAssignment.update({
        where: { id: assignmentId },
        data: {
          status: StatusEnum.INACTIVE,
          care_notes: reason ? `Deactivated: ${reason}` : undefined,
        },
      });

      console.log(`[Repo] Deactivated assignment: ${assignmentId}`);
      return this.toDomainModel(updated);
    } catch (error: any) {
      if (error.code === 'P2025') {
        throw new NotFoundError(`Assignment not found with ID ${assignmentId}`);
      }
      console.error('[Repo] Error deactivating assignment:', error);
      throw new Error(`Failed to deactivate assignment: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async reactivate(assignmentId: string): Promise<DoctorPatientAssignmentModel> {
    try {
      const existing = await db.doctorPatientAssignment.findUnique({
        where: { id: assignmentId },
        select: { status: true },
      });

      if (!existing) {
        throw new NotFoundError(`Assignment not found with ID ${assignmentId}`);
      }

      if (existing.status !== StatusEnum.INACTIVE) {
        throw new ValidationError(`Cannot reactivate assignment that is not INACTIVE (current status: ${existing.status})`);
      }

      const updated = await db.doctorPatientAssignment.update({
        where: { id: assignmentId },
        data: { status: StatusEnum.ACTIVE },
      });

      console.log(`[Repo] Reactivated assignment: ${assignmentId}`);
      return this.toDomainModel(updated);
    } catch (error) {
      if (error instanceof ValidationError || error instanceof NotFoundError) throw error;
      console.error('[Repo] Error reactivating assignment:', error);
      throw new Error(`Failed to reactivate assignment: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async delete(assignmentId: string): Promise<void> {
    try {
      await db.doctorPatientAssignment.delete({
        where: { id: assignmentId },
      });

      console.log(`[Repo] Deleted assignment: ${assignmentId}`);
    } catch (error: any) {
      if (error.code === 'P2025') {
        throw new NotFoundError(`Assignment not found with ID ${assignmentId}`);
      }
      console.error('[Repo] Error deleting assignment:', error);
      throw new Error(`Failed to delete assignment: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async isActivelyManaging(doctorId: string, patientId: string): Promise<boolean> {
    try {
      const assignment = await db.doctorPatientAssignment.findUnique({
        where: {
          doctor_id_patient_id: {
            doctor_id: doctorId,
            patient_id: patientId,
          },
        },
        select: { status: true },
      });

      return assignment?.status === StatusEnum.ACTIVE;
    } catch (error) {
      console.error('[Repo] Error checking active assignment:', error);
      throw new Error(`Failed to check active assignment: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async countActivePatients(doctorId: string): Promise<number> {
    try {
      const count = await db.doctorPatientAssignment.count({
        where: {
          doctor_id: doctorId,
          status: StatusEnum.ACTIVE,
        },
      });

      return count;
    } catch (error) {
      console.error('[Repo] Error counting active patients:', error);
      throw new Error(`Failed to count active patients: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

/**
 * Singleton instance of the repository
 */
export const assignmentRepository = new DoctorPatientAssignmentRepository();

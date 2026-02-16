import { PrismaClient, SurgicalChecklist } from '@prisma/client';
import {
  ISurgicalChecklistRepository,
  ChecklistItemConfirmation,
} from '@/domain/interfaces/repositories/ISurgicalChecklistRepository';

/**
 * Repository: PrismaSurgicalChecklistRepository
 *
 * Prisma-based implementation of ISurgicalChecklistRepository.
 * Handles persistence for WHO Surgical Safety Checklist data.
 *
 * Key design decisions:
 * - Phase completion is idempotent: re-completing a phase is a no-op.
 * - Gate checks use targeted selects (no full row load) for performance.
 * - JSON items are serialized/deserialized cleanly.
 */
export class PrismaSurgicalChecklistRepository implements ISurgicalChecklistRepository {
  constructor(private readonly prisma: PrismaClient) {
    if (!prisma) {
      throw new Error('PrismaClient is required');
    }
  }

  async findByCaseId(surgicalCaseId: string): Promise<SurgicalChecklist | null> {
    return this.prisma.surgicalChecklist.findUnique({
      where: { surgical_case_id: surgicalCaseId },
    });
  }

  async findById(id: string): Promise<SurgicalChecklist | null> {
    return this.prisma.surgicalChecklist.findUnique({
      where: { id },
    });
  }

  async ensureExists(surgicalCaseId: string): Promise<SurgicalChecklist> {
    // Upsert: create if missing, return existing if present
    return this.prisma.surgicalChecklist.upsert({
      where: { surgical_case_id: surgicalCaseId },
      update: {}, // no-op if exists
      create: {
        surgical_case_id: surgicalCaseId,
      },
    });
  }

  async completePhase(
    surgicalCaseId: string,
    phase: 'SIGN_IN' | 'TIME_OUT' | 'SIGN_OUT',
    data: {
      userId: string;
      userRole: string;
      items: ChecklistItemConfirmation[];
    }
  ): Promise<SurgicalChecklist> {
    // Ensure checklist row exists
    await this.ensureExists(surgicalCaseId);

    // Map phase to column names
    const columns = this.phaseColumns(phase);

    // Idempotency: check if already completed
    const existing = await this.prisma.surgicalChecklist.findUnique({
      where: { surgical_case_id: surgicalCaseId },
      select: { [columns.completedAt]: true },
    });

    if (existing && existing[columns.completedAt as keyof typeof existing] !== null) {
      // Already completed — return existing without mutation
      return this.prisma.surgicalChecklist.findUniqueOrThrow({
        where: { surgical_case_id: surgicalCaseId },
      });
    }

    // Complete the phase
    return this.prisma.surgicalChecklist.update({
      where: { surgical_case_id: surgicalCaseId },
      data: {
        [columns.completedAt]: new Date(),
        [columns.byUserId]: data.userId,
        [columns.byRole]: data.userRole,
        [columns.items]: JSON.stringify(data.items),
      },
    });
  }

  async saveDraftItems(
    surgicalCaseId: string,
    phase: 'SIGN_IN' | 'TIME_OUT' | 'SIGN_OUT',
    items: ChecklistItemConfirmation[]
  ): Promise<SurgicalChecklist> {
    // Ensure checklist row exists
    await this.ensureExists(surgicalCaseId);

    const columns = this.phaseColumns(phase);

    // Guard: cannot save draft if phase already finalized
    const existing = await this.prisma.surgicalChecklist.findUnique({
      where: { surgical_case_id: surgicalCaseId },
      select: { [columns.completedAt]: true },
    });

    if (existing && existing[columns.completedAt as keyof typeof existing] !== null) {
      throw new Error(`Cannot save draft: ${phase} is already finalized`);
    }

    // Save items JSON without setting completedAt
    return this.prisma.surgicalChecklist.update({
      where: { surgical_case_id: surgicalCaseId },
      data: {
        [columns.items]: JSON.stringify(items),
      },
    });
  }

  async isPhaseCompleted(
    surgicalCaseId: string,
    phase: 'SIGN_IN' | 'TIME_OUT' | 'SIGN_OUT'
  ): Promise<boolean> {
    const columns = this.phaseColumns(phase);

    const result = await this.prisma.surgicalChecklist.findUnique({
      where: { surgical_case_id: surgicalCaseId },
      select: { [columns.completedAt]: true },
    });

    if (!result) return false;
    return result[columns.completedAt as keyof typeof result] !== null;
  }

  /**
   * Maps a phase enum to the corresponding database column names.
   */
  private phaseColumns(phase: 'SIGN_IN' | 'TIME_OUT' | 'SIGN_OUT') {
    const map = {
      SIGN_IN: {
        completedAt: 'sign_in_completed_at',
        byUserId: 'sign_in_by_user_id',
        byRole: 'sign_in_by_role',
        items: 'sign_in_items',
      },
      TIME_OUT: {
        completedAt: 'time_out_completed_at',
        byUserId: 'time_out_by_user_id',
        byRole: 'time_out_by_role',
        items: 'time_out_items',
      },
      SIGN_OUT: {
        completedAt: 'sign_out_completed_at',
        byUserId: 'sign_out_by_user_id',
        byRole: 'sign_out_by_role',
        items: 'sign_out_items',
      },
    } as const;

    return map[phase];
  }
}

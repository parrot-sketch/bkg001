import { ICasePlanRepository } from '@/domain/interfaces/repositories/ICasePlanRepository';
import { ISurgicalCaseRepository } from '@/domain/interfaces/repositories/ISurgicalCaseRepository';
import { IAuditService } from '@/domain/interfaces/services/IAuditService';
import { CreateCasePlanDto } from '@/application/dtos/CreateCasePlanDto';
import { CasePlan, SurgicalCaseStatus } from '@prisma/client';

/**
 * Use Case: CreateCasePlanUseCase
 *
 * Orchestrates saving/updating an operative plan (CasePlan).
 *
 * Side-effects:
 * - If the CasePlan is not linked to a SurgicalCase, one is created (shadow creation)
 *   and bidirectionally linked via ICasePlanRepository.linkToSurgicalCase().
 * - If the linked SurgicalCase is in DRAFT status, it is automatically transitioned
 *   to PLANNING, indicating active surgical planning has begun.
 */
export class CreateCasePlanUseCase {
    constructor(
        private readonly casePlanRepository: ICasePlanRepository,
        private readonly surgicalCaseRepository: ISurgicalCaseRepository,
        private readonly auditService: IAuditService,
    ) {}

    async execute(dto: CreateCasePlanDto, userId: string): Promise<CasePlan> {
        // 1. Save (upsert) the Case Plan
        const casePlan = await this.casePlanRepository.save(dto);

        // 2. Ensure a SurgicalCase exists and is linked
        let surgicalCaseId = casePlan.surgical_case_id;

        if (!surgicalCaseId) {
            try {
                const surgicalCase = await this.surgicalCaseRepository.create({
                    patientId: dto.patientId,
                    primarySurgeonId: dto.doctorId,
                    createdBy: userId,
                });

                surgicalCaseId = surgicalCase.id;

                // Bidirectionally link the CasePlan ↔ SurgicalCase
                await this.casePlanRepository.linkToSurgicalCase(casePlan.id, surgicalCase.id);
            } catch (e) {
                console.error('[CreateCasePlanUseCase] Failed to create/link surgical case:', e);
            }
        }

        // 3. Auto-transition DRAFT → PLANNING when a plan is being actively worked on
        if (surgicalCaseId) {
            try {
                const surgicalCase = await this.surgicalCaseRepository.findById(surgicalCaseId);
                if (surgicalCase && surgicalCase.status === SurgicalCaseStatus.DRAFT) {
                    await this.surgicalCaseRepository.updateStatus(
                        surgicalCaseId,
                        SurgicalCaseStatus.PLANNING,
                    );
                }
            } catch (e) {
                console.error('[CreateCasePlanUseCase] Failed to auto-transition case to PLANNING:', e);
            }
        }

        // 4. Audit Log
        await this.auditService.recordEvent({
            userId,
            recordId: casePlan.id.toString(),
            action: 'UPSERT',
            model: 'CasePlan',
            details: `Operative plan updated for appointment ${dto.appointmentId}`,
        });

        return casePlan;
    }
}

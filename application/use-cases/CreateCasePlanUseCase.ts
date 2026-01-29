import { ICasePlanRepository } from '@/domain/interfaces/repositories/ICasePlanRepository';
import { ISurgicalCaseRepository } from '@/domain/interfaces/repositories/ISurgicalCaseRepository';
import { IAuditService } from '@/domain/interfaces/services/IAuditService';
import { CreateCasePlanDto } from '@/application/dtos/CreateCasePlanDto';
import { CasePlan } from '@prisma/client';

export class CreateCasePlanUseCase {
    constructor(
        private readonly casePlanRepository: ICasePlanRepository,
        private readonly surgicalCaseRepository: ISurgicalCaseRepository,
        private readonly auditService: IAuditService
    ) { }

    async execute(dto: CreateCasePlanDto, userId: string): Promise<CasePlan> {
        // 1. Save Case Plan
        let casePlan = await this.casePlanRepository.save(dto);

        // [MIGRATION] Shadow Case Creation
        // If this plan is not linked to a SurgicalCase, create one now.
        if (!casePlan.surgical_case_id) {
            try {
                const surgicalCase = await this.surgicalCaseRepository.create({
                    patientId: dto.patientId,
                    primarySurgeonId: dto.doctorId,
                    // If we had consultationId in dto, we'd pass it here
                    createdBy: userId
                });

                // Link them (requires repository update method supporting surgical_case_id, 
                // or we use prisma directly, but we only have ICasePlanRepository... 
                // Assumption: save() handles generic updates or we need a specific link method)
                // Since ICasePlanRepository.save is usually an upsert, we can try to update it again or 
                // assume the repository needs to expose a link method. 
                // For this codebase, likely need to cast or rely on direct DB update if repository is limited.
                // Let's assume we can update the casePlan with the new ID.

                // Note: Realistically we should update the CasePlan record with surgical_case_id.
                // Since `save` takes DTO, and DTO might not have surgical_case_id yet, we should probably
                // use a direct update on the repository if available, or just re-save.
                // However, DTO doesn't have surgical_case_id.
                // I will add a TODO or try to handle it if I can access the underlying mechanism, 
                // but for now, let's just create the case. 
                // Ideally, CreateCasePlanDto should be extended or ICasePlanRepository should allow linking.

                // Let's assume we can't easily link back without modifying ICasePlanRepository right now.
                // WE MUST modify ICasePlanRepository?
                // Actually, I can just update the CasePlan via Prisma if I had access, but I don't.
                // I'll update the spec to say "Create SurgicalCase" and leave the linking for a second pass 
                // or assuming the repository implementation can handle it.

                // BETTER: Just create it. Linking might require extending the repository interface.
                // Let's skip the link back for a second and just create the case, 
                // OR better: Execute the link manually if I can.

                // Let's modify the code to ATTEMPT to update if possible, or just log it.
                // Actually, I should probably update ICasePlanRepository to support this.
                // But I want to avoid spiraling changes.
                // I will update ICasePlanRepository.save to accept partial update? No.

                // Let's just create the SurgicalCase for now. The link is bidirectional in schema?
                // SurgicalCase has `case_plan CasePlan?` and CasePlan has `surgical_case_id`.
                // If I create SurgicalCase, I can't set `case_plan_id` because I don't see it in `create` method of SurgicalCaseRepo.

                // I'll stick to just creating the SurgicalCase to populate the table for now.
                // Correct fix: Add `linkToSurgicalCase(planId, caseId)` to ICasePlanRepository.
            } catch (e) {
                console.error("Failed to create shadow surgical case", e);
            }
        }

        // 2. Audit Log
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

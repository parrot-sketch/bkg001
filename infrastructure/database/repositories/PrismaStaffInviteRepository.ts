import { IStaffInviteRepository } from '@/domain/interfaces/repositories/IStaffInviteRepository';
import { StaffInvite, InviteStatus, SurgicalRole } from '@prisma/client';
import db from '@/lib/db';

export class PrismaStaffInviteRepository implements IStaffInviteRepository {
    async create(data: {
        surgicalCaseId: string;
        invitedUserId: string;
        invitedRole: SurgicalRole;
        invitedByUserId: string;
        procedureRecordId?: string;
    }): Promise<StaffInvite> {
        return await db.staffInvite.create({
            data: {
                surgical_case_id: data.surgicalCaseId,
                invited_user_id: data.invitedUserId,
                invited_role: data.invitedRole,
                invited_by_user_id: data.invitedByUserId,
                procedure_record_id: data.procedureRecordId ? parseInt(data.procedureRecordId) : undefined,
                status: InviteStatus.PENDING,
            },
        });
    }

    async findById(id: string): Promise<StaffInvite | null> {
        return await db.staffInvite.findUnique({
            where: { id },
            include: {
                surgical_case: {
                    select: {
                        procedure_name: true,
                        primary_surgeon: {
                            select: {
                                name: true,
                            },
                        },
                        patient: {
                            select: {
                                first_name: true,
                                last_name: true,
                                file_number: true,
                            }
                        }
                    }
                },
                invited_by: {
                    select: {
                        first_name: true,
                        last_name: true,
                    }
                }
            }
        });
    }

    async findByUser(userId: string, status?: InviteStatus): Promise<StaffInvite[]> {
        return await db.staffInvite.findMany({
            where: {
                invited_user_id: userId,
                ...(status ? { status } : {}),
            },
            orderBy: { created_at: 'desc' },
            include: {
                surgical_case: {
                    select: {
                        procedure_name: true,
                        status: true,
                        primary_surgeon: {
                            select: {
                                name: true,
                            },
                        },
                        patient: {
                            select: {
                                first_name: true,
                                last_name: true,
                                file_number: true,
                            }
                        }
                    }
                },
                invited_by: {
                    select: {
                        first_name: true,
                        last_name: true,
                    }
                }
            }
        });
    }

    async findByCaseId(caseId: string): Promise<StaffInvite[]> {
        return await db.staffInvite.findMany({
            where: { surgical_case_id: caseId },
            include: {
                invited_user: {
                    select: {
                        id: true,
                        first_name: true,
                        last_name: true,
                        email: true,
                        role: true,
                    }
                }
            }
        });
    }

    async updateStatus(
        id: string,
        status: InviteStatus,
        response?: { declinedReason?: string; acknowledgedAt?: Date }
    ): Promise<StaffInvite> {
        return await db.staffInvite.update({
            where: { id },
            data: {
                status,
                declined_reason: response?.declinedReason,
                acknowledged_at: response?.acknowledgedAt,
            },
        });
    }

    async findExistingInvite(
        surgicalCaseId: string,
        invitedUserId: string,
        invitedRole: SurgicalRole
    ): Promise<StaffInvite | null> {
        return await db.staffInvite.findUnique({
            where: {
                surgical_case_id_invited_user_id_invited_role: {
                    surgical_case_id: surgicalCaseId,
                    invited_user_id: invitedUserId,
                    invited_role: invitedRole,
                }
            }
        });
    }
}

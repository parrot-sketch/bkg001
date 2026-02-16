import { StaffInvite, InviteStatus, SurgicalRole } from '@prisma/client';

export interface IStaffInviteRepository {
    create(data: {
        surgicalCaseId: string;
        invitedUserId: string;
        invitedRole: SurgicalRole;
        invitedByUserId: string;
        procedureRecordId?: string;
    }): Promise<StaffInvite>;

    findById(id: string): Promise<StaffInvite | null>;

    findByUser(userId: string, status?: InviteStatus): Promise<StaffInvite[]>;

    findByCaseId(caseId: string): Promise<StaffInvite[]>;

    updateStatus(
        id: string,
        status: InviteStatus,
        response?: {
            declinedReason?: string;
            acknowledgedAt?: Date;
        }
    ): Promise<StaffInvite>;

    findExistingInvite(
        surgicalCaseId: string,
        invitedUserId: string,
        invitedRole: SurgicalRole
    ): Promise<StaffInvite | null>;
}

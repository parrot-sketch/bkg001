import { Role, SurgicalRole, SurgicalTeamRole } from '@prisma/client';

export const TEAM_ASSIGNMENT_MODE: 'DIRECT' | 'INVITE' = 'INVITE';

/**
 * Maps SurgicalTeamRole to allowed User Roles (Role enum).
 * This aligns with the newer team assignment workflow.
 */
export const TEAM_ROLE_ELIGIBILITY: Record<string, Role[]> = {
    CO_SURGEON: [Role.DOCTOR],
    ANAESTHESIOLOGIST: [Role.DOCTOR],
    SCRUB_NURSE: [Role.NURSE, Role.THEATER_TECHNICIAN],
    CIRCULATING_NURSE: [Role.NURSE],
    THEATER_TECH: [Role.THEATER_TECHNICIAN, Role.NURSE],
    OBSERVER: [Role.DOCTOR, Role.NURSE, Role.FRONTDESK, Role.THEATER_TECHNICIAN],
};

/**
 * Maps SurgicalRole to allowed User Roles (Role enum).
 * Legacy mapping for compatibility.
 */
export const ALLOWED_ROLES_MAP: Record<SurgicalRole, Role[]> = {
    [SurgicalRole.SURGEON]: [Role.DOCTOR],
    [SurgicalRole.ASSISTANT_SURGEON]: [Role.DOCTOR],
    [SurgicalRole.ANESTHESIOLOGIST]: [Role.DOCTOR],
    [SurgicalRole.ANESTHETIST_NURSE]: [Role.NURSE],
    [SurgicalRole.SCRUB_NURSE]: [Role.NURSE, Role.THEATER_TECHNICIAN],
    [SurgicalRole.CIRCULATING_NURSE]: [Role.NURSE],
    [SurgicalRole.THEATER_TECHNICIAN]: [Role.THEATER_TECHNICIAN, Role.NURSE],
};

/**
 * Checks if a user keys (role) is eligible for a specific surgical role.
 */
export function isEligibleForSurgicalRole(userRole: Role, surgicalRole: SurgicalRole): boolean {
    const allowed = ALLOWED_ROLES_MAP[surgicalRole];
    return allowed ? allowed.includes(userRole) : false;
}

/**
 * Validates eligibility or throws an error.
 */
export function enforceEligibility(userRole: Role, surgicalRole: SurgicalRole): void {
    if (!isEligibleForSurgicalRole(userRole, surgicalRole)) {
        throw new Error(`User with role '${userRole}' is not eligible for surgical role '${surgicalRole}'. Allowed: ${ALLOWED_ROLES_MAP[surgicalRole]?.join(', ')}`);
    }
}

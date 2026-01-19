import { Role } from '../../domain/enums/Role';
import { AuthContext } from '../types';

/**
 * Permission configuration
 * Defines which roles can access which resources
 */
export interface Permission {
  /**
   * Resource name (e.g., 'patient', 'appointment')
   */
  resource: string;

  /**
   * Action name (e.g., 'create', 'read', 'update', 'delete')
   */
  action: string;

  /**
   * Roles allowed to perform this action on this resource
   */
  allowedRoles: Role[];
}

/**
 * RBAC Middleware
 * 
 * Role-Based Access Control middleware for enforcing permissions.
 * 
 * This middleware checks if a user's role allows them to perform
 * a specific action on a specific resource.
 * 
 * Permission Model:
 * - ADMIN: Full access to all resources
 * - DOCTOR: Access to appointments, consultations, patient records (read)
 * - NURSE: Access to patient check-in, vitals, patient records (read)
 * - FRONTDESK: Access to patient creation, check-in, appointment scheduling
 * - PATIENT: Access to own records and appointments
 * - LAB_TECHNICIAN: Access to lab tests and patient records (read)
 * - CASHIER: Access to billing and payments
 */
export class RbacMiddleware {
  /**
   * Default permission rules
   */
  private static readonly DEFAULT_PERMISSIONS: Permission[] = [
    // Patient permissions
    { resource: 'patient', action: 'create', allowedRoles: [Role.ADMIN, Role.FRONTDESK] },
    { resource: 'patient', action: 'read', allowedRoles: [Role.ADMIN, Role.DOCTOR, Role.NURSE, Role.FRONTDESK, Role.LAB_TECHNICIAN] },
    { resource: 'patient', action: 'update', allowedRoles: [Role.ADMIN, Role.DOCTOR, Role.FRONTDESK] },
    { resource: 'patient', action: 'delete', allowedRoles: [Role.ADMIN] },

    // Appointment permissions
    { resource: 'appointment', action: 'create', allowedRoles: [Role.ADMIN, Role.DOCTOR, Role.FRONTDESK, Role.PATIENT] },
    { resource: 'appointment', action: 'read', allowedRoles: [Role.ADMIN, Role.DOCTOR, Role.NURSE, Role.FRONTDESK, Role.PATIENT] },
    { resource: 'appointment', action: 'update', allowedRoles: [Role.ADMIN, Role.DOCTOR, Role.FRONTDESK] },
    { resource: 'appointment', action: 'cancel', allowedRoles: [Role.ADMIN, Role.DOCTOR, Role.FRONTDESK, Role.PATIENT] },

    // Check-in permissions
    { resource: 'appointment', action: 'checkin', allowedRoles: [Role.ADMIN, Role.NURSE, Role.FRONTDESK] },

    // Consultation permissions
    { resource: 'consultation', action: 'start', allowedRoles: [Role.ADMIN, Role.DOCTOR] },
    { resource: 'consultation', action: 'complete', allowedRoles: [Role.ADMIN, Role.DOCTOR] },
    { resource: 'consultation', action: 'read', allowedRoles: [Role.ADMIN, Role.DOCTOR, Role.NURSE] },

    // Billing permissions
    { resource: 'billing', action: 'create', allowedRoles: [Role.ADMIN, Role.CASHIER] },
    { resource: 'billing', action: 'read', allowedRoles: [Role.ADMIN, Role.CASHIER, Role.DOCTOR] },
    { resource: 'billing', action: 'update', allowedRoles: [Role.ADMIN, Role.CASHIER] },

    // Lab test permissions
    { resource: 'labtest', action: 'create', allowedRoles: [Role.ADMIN, Role.LAB_TECHNICIAN, Role.DOCTOR] },
    { resource: 'labtest', action: 'read', allowedRoles: [Role.ADMIN, Role.LAB_TECHNICIAN, Role.DOCTOR] },
    { resource: 'labtest', action: 'update', allowedRoles: [Role.ADMIN, Role.LAB_TECHNICIAN] },
  ];

  /**
   * Checks if a user has permission to perform an action on a resource
   * 
   * @param authContext - Authenticated user context
   * @param resource - Resource name
   * @param action - Action name
   * @param customPermissions - Optional custom permissions (overrides defaults)
   * @returns true if user has permission, false otherwise
   */
  static hasPermission(
    authContext: AuthContext,
    resource: string,
    action: string,
    customPermissions?: Permission[],
  ): boolean {
    // ADMIN has full access
    if (authContext.role === Role.ADMIN) {
      return true;
    }

    // Check permissions
    const permissions = customPermissions ?? this.DEFAULT_PERMISSIONS;
    const permission = permissions.find((p) => p.resource === resource && p.action === action);

    if (!permission) {
      // No permission rule found - deny access by default
      return false;
    }

    return permission.allowedRoles.includes(authContext.role as Role);
  }

  /**
   * Middleware function to check permissions
   * 
   * @param authContext - Authenticated user context
   * @param resource - Resource name
   * @param action - Action name
   * @param customPermissions - Optional custom permissions
   * @throws Error if user doesn't have permission
   */
  static requirePermission(
    authContext: AuthContext,
    resource: string,
    action: string,
    customPermissions?: Permission[],
  ): void {
    if (!this.hasPermission(authContext, resource, action, customPermissions)) {
      throw new Error(`Access denied: User ${authContext.userId} (${authContext.role}) does not have permission to ${action} on ${resource}`);
    }
  }

  /**
   * Checks if a user can access a specific resource (for PATIENT role)
   * 
   * PATIENT users can only access their own records.
   * 
   * @param authContext - Authenticated user context
   * @param resourceOwnerId - ID of the resource owner
   * @returns true if user can access the resource, false otherwise
   */
  static canAccessResource(authContext: AuthContext, resourceOwnerId: string): boolean {
    // Admin and staff can access any resource
    if (authContext.role !== Role.PATIENT) {
      return true;
    }

    // PATIENT can only access their own resources
    return authContext.userId === resourceOwnerId;
  }
}

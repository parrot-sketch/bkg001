/**
 * Role Utilities
 * 
 * Utilities for checking user roles and permissions.
 */

import { Role } from "@/domain/enums/Role";
import { getCurrentUser } from "@/lib/auth/server-auth";

/**
 * Check if the current user has a specific role
 * 
 * @param role - The role to check (e.g., Role.ADMIN, Role.DOCTOR, or "ADMIN", "DOCTOR")
 * @returns true if user has the role, false otherwise
 */
export const checkRole = async (role: Role | string): Promise<boolean> => {
  try {
    const user = await getCurrentUser();
    if (!user || !user.role) {
      return false;
    }
    
    // Normalize role comparison (case-insensitive)
    const userRole = user.role.toUpperCase();
    const checkRoleUpper = typeof role === 'string' ? role.toUpperCase() : role;
    
    return userRole === checkRoleUpper;
  } catch (error) {
    console.error('Error checking role:', error);
    return false;
  }
};

/**
 * Get the current user's role
 * 
 * @returns The user's role as a lowercase string, or "patient" as default
 */
export const getRole = async (): Promise<string> => {
  try {
    const user = await getCurrentUser();
    if (!user || !user.role) {
      return "patient";
    }
    
    return user.role.toLowerCase();
  } catch (error) {
    console.error('Error getting role:', error);
    return "patient";
  }
};

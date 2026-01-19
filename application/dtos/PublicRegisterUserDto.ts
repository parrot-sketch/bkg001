import { Role } from '../../domain/enums/Role';

/**
 * DTO: PublicRegisterUserDto
 * 
 * Data transfer object for PUBLIC user registration.
 * This is used for self-registration by visitors/users.
 * 
 * Key Differences from RegisterUserDto:
 * - NO 'id' field (server generates UUID)
 * - NO 'role' field (always defaults to PATIENT)
 * - Simplified for public-facing registration
 * 
 * Security Considerations:
 * - Client cannot specify ID (prevents enumeration)
 * - Client cannot specify role (prevents privilege escalation)
 * - Only PATIENT role allowed for public signup
 */
export interface PublicRegisterUserDto {
  /**
   * User's email address (must be unique)
   */
  email: string;

  /**
   * User's plain text password (will be validated and hashed)
   */
  password: string;

  /**
   * User's first name (optional)
   */
  firstName?: string;

  /**
   * User's last name (optional)
   */
  lastName?: string;

  /**
   * User's phone number (optional)
   */
  phone?: string;
}

/**
 * DTO: PublicRegisterUserResponseDto
 * 
 * Response DTO for public registration.
 * Does not expose sensitive information.
 */
export interface PublicRegisterUserResponseDto {
  /**
   * User's unique identifier (server-generated)
   */
  id: string;

  /**
   * User's email address
   */
  email: string;

  /**
   * User's role (always PATIENT for public signup)
   */
  role: Role.PATIENT;

  /**
   * User's first name (if provided)
   */
  firstName?: string;

  /**
   * User's last name (if provided)
   */
  lastName?: string;

  /**
   * Registration timestamp
   */
  createdAt: Date;
}

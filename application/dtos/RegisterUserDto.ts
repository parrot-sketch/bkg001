import { Role } from '../../domain/enums/Role';

/**
 * DTO: RegisterUserDto
 * 
 * Data transfer object for user registration request.
 */
export interface RegisterUserDto {
  /**
   * User's unique identifier (typically generated on client or server)
   */
  id: string;

  /**
   * User's email address (must be unique)
   */
  email: string;

  /**
   * User's plain text password (will be hashed)
   */
  password: string;

  /**
   * User's role
   */
  role: Role;

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
 * DTO: RegisterUserResponseDto
 * 
 * Data transfer object for user registration response.
 */
export interface RegisterUserResponseDto {
  /**
   * User's unique identifier
   */
  id: string;

  /**
   * User's email address
   */
  email: string;

  /**
   * User's role
   */
  role: Role;

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

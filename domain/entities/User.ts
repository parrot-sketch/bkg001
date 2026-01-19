import { Email } from '../value-objects/Email';
import { Role } from '../enums/Role';
import { Status } from '../enums/Status';
import { DomainException } from '../exceptions/DomainException';

/**
 * Entity: User
 * 
 * Represents an authenticated user in the healthcare system.
 * This is a rich domain entity that encapsulates authentication and authorization concerns.
 * 
 * Business Rules:
 * - User must have a valid ID (immutable once set)
 * - User must have a valid email address
 * - User must have a hashed password (never store plain text)
 * - User must have at least one role
 * - User status determines if they can authenticate
 * - Only ACTIVE users can authenticate
 * 
 * Security Considerations:
 * - Password is stored as hash, never plain text
 * - Password verification happens outside this entity (via AuthService)
 * - MFA flag indicates if multi-factor authentication is enabled
 * 
 * Note: This entity does not depend on Prisma or any framework.
 * It represents the pure domain concept of a User with authentication.
 */
export class User {
  private constructor(
    private readonly id: string,
    private readonly email: Email,
    private readonly passwordHash: string, // Always hashed, never plain text
    private readonly role: Role,
    private readonly status: Status,
    private readonly mfaEnabled: boolean,
    private readonly mfaSecret?: string, // Encrypted MFA secret if MFA is enabled
    // Optional fields
    private readonly firstName?: string,
    private readonly lastName?: string,
    private readonly phone?: string,
    // Timestamps
    private readonly lastLoginAt?: Date,
    private readonly createdAt?: Date,
    private readonly updatedAt?: Date,
  ) {
    // Validation happens in factory method
  }

  /**
   * Creates a new User entity
   * 
   * @param params - User creation parameters
   * @returns User entity
   * @throws DomainException if validation fails
   */
  static create(params: {
    id: string;
    email: string | Email;
    passwordHash: string; // Must be pre-hashed by AuthService
    role: Role;
    status?: Status; // Defaults to ACTIVE
    mfaEnabled?: boolean; // Defaults to false
    mfaSecret?: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
    lastLoginAt?: Date;
    createdAt?: Date;
    updatedAt?: Date;
  }): User {
    // Validate required fields
    if (!params.id || typeof params.id !== 'string' || params.id.trim().length === 0) {
      throw new DomainException('User ID cannot be empty', {
        providedValue: params.id,
      });
    }

    if (!params.passwordHash || typeof params.passwordHash !== 'string' || params.passwordHash.trim().length === 0) {
      throw new DomainException('Password hash cannot be empty', {
        providedValue: params.passwordHash,
      });
    }

    // Validate password hash looks like a hash (basic check)
    // Bcrypt hashes start with $2a$, $2b$, or $2y$
    // Argon2 hashes start with $argon2
    if (!params.passwordHash.startsWith('$')) {
      throw new DomainException('Password hash format is invalid', {
        providedValue: params.passwordHash,
      });
    }

    // Convert email to Email value object if needed
    const email = params.email instanceof Email ? params.email : Email.create(params.email);

    // Validate MFA secret if MFA is enabled
    if (params.mfaEnabled && !params.mfaSecret) {
      throw new DomainException('MFA secret is required when MFA is enabled', {
        mfaEnabled: params.mfaEnabled,
      });
    }

    return new User(
      params.id.trim(),
      email,
      params.passwordHash,
      params.role,
      params.status ?? Status.ACTIVE,
      params.mfaEnabled ?? false,
      params.mfaSecret,
      params.firstName?.trim(),
      params.lastName?.trim(),
      params.phone?.trim(),
      params.lastLoginAt,
      params.createdAt,
      params.updatedAt,
    );
  }

  // Getters

  getId(): string {
    return this.id;
  }

  getEmail(): Email {
    return this.email;
  }

  getPasswordHash(): string {
    return this.passwordHash;
  }

  getRole(): Role {
    return this.role;
  }

  getStatus(): Status {
    return this.status;
  }

  isMfaEnabled(): boolean {
    return this.mfaEnabled;
  }

  getMfaSecret(): string | undefined {
    return this.mfaSecret;
  }

  getFirstName(): string | undefined {
    return this.firstName;
  }

  getLastName(): string | undefined {
    return this.lastName;
  }

  getFullName(): string {
    if (this.firstName && this.lastName) {
      return `${this.firstName} ${this.lastName}`;
    }
    if (this.firstName) {
      return this.firstName;
    }
    if (this.lastName) {
      return this.lastName;
    }
    return this.email.getValue();
  }

  getPhone(): string | undefined {
    return this.phone;
  }

  getLastLoginAt(): Date | undefined {
    return this.lastLoginAt ? new Date(this.lastLoginAt) : undefined;
  }

  getCreatedAt(): Date | undefined {
    return this.createdAt ? new Date(this.createdAt) : undefined;
  }

  getUpdatedAt(): Date | undefined {
    return this.updatedAt ? new Date(this.updatedAt) : undefined;
  }

  // Business logic methods

  /**
   * Checks if the user can authenticate
   * 
   * @returns true if user is ACTIVE
   */
  canAuthenticate(): boolean {
    return this.status === Status.ACTIVE;
  }

  /**
   * Checks if the user has a specific role
   * 
   * @param role - Role to check
   * @returns true if user has the role
   */
  hasRole(role: Role): boolean {
    return this.role === role;
  }

  /**
   * Checks if the user has any of the specified roles
   * 
   * @param roles - Array of roles to check
   * @returns true if user has at least one of the roles
   */
  hasAnyRole(roles: Role[]): boolean {
    return roles.includes(this.role);
  }

  /**
   * Checks if the user is an administrator
   * 
   * @returns true if user has ADMIN role
   */
  isAdmin(): boolean {
    return this.role === Role.ADMIN;
  }

  /**
   * Checks if the user is a patient
   * 
   * @returns true if user has PATIENT role
   */
  isPatient(): boolean {
    return this.role === Role.PATIENT;
  }

  /**
   * Checks if the user is a clinical staff member (Doctor, Nurse, Lab Technician)
   * 
   * @returns true if user has a clinical role
   */
  isClinicalStaff(): boolean {
    return [Role.DOCTOR, Role.NURSE, Role.LAB_TECHNICIAN].includes(this.role);
  }

  /**
   * Checks equality with another User entity
   * 
   * @param other - Another User entity
   * @returns true if users have the same ID
   */
  equals(other: User | null | undefined): boolean {
    if (!other) {
      return false;
    }
    // Entities are equal if they have the same ID
    return this.id === other.id;
  }

  /**
   * String representation for logging/debugging
   * Note: Never log password hash or MFA secret
   */
  toString(): string {
    return `User(id=${this.id}, email=${this.email.getValue()}, role=${this.role}, status=${this.status})`;
  }
}

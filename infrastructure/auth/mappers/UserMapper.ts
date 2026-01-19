import { User } from '../../../domain/entities/User';
import { Email } from '../../../domain/value-objects/Email';
import { Role } from '../../../domain/enums/Role';
import { Status } from '../../../domain/enums/Status';
import { Prisma, User as PrismaUser } from '@prisma/client';

/**
 * Mapper: UserMapper
 * 
 * Maps between Prisma User model and domain User entity.
 * This mapper handles the translation between infrastructure (Prisma) and domain layers.
 * 
 * Responsibilities:
 * - Convert Prisma snake_case to domain camelCase
 * - Convert Prisma enums to domain enums
 * - Handle optional fields and null values
 * - NO business logic - only data translation
 */
export class UserMapper {
  /**
   * Maps a Prisma User model to a domain User entity
   * 
   * @param prismaUser - Prisma User model from database
   * @returns Domain User entity
   * @throws Error if required fields are missing or invalid
   */
  static fromPrisma(prismaUser: PrismaUser): User {
    return User.create({
      id: prismaUser.id,
      email: Email.create(prismaUser.email),
      passwordHash: prismaUser.password_hash,
      role: prismaUser.role as Role,
      status: prismaUser.status as Status,
      mfaEnabled: prismaUser.mfa_enabled,
      mfaSecret: prismaUser.mfa_secret ?? undefined,
      firstName: prismaUser.first_name ?? undefined,
      lastName: prismaUser.last_name ?? undefined,
      phone: prismaUser.phone ?? undefined,
      lastLoginAt: prismaUser.last_login_at ?? undefined,
      createdAt: prismaUser.created_at,
      updatedAt: prismaUser.updated_at,
    });
  }

  /**
   * Maps a domain User entity to Prisma UserCreateInput for creation
   * 
   * @param user - Domain User entity
   * @returns Prisma UserCreateInput for creating a new user
   */
  static toPrismaCreateInput(user: User): Prisma.UserCreateInput {
    return {
      id: user.getId(),
      email: user.getEmail().getValue(),
      password_hash: user.getPasswordHash(),
      role: user.getRole(),
      status: user.getStatus(),
      mfa_enabled: user.isMfaEnabled(),
      mfa_secret: user.getMfaSecret() ?? null,
      first_name: user.getFirstName() ?? null,
      last_name: user.getLastName() ?? null,
      phone: user.getPhone() ?? null,
      last_login_at: user.getLastLoginAt() ?? null,
      // Timestamps will be set by Prisma automatically
    };
  }

  /**
   * Maps a domain User entity to Prisma UserUpdateInput for updates
   * 
   * @param user - Domain User entity with updated values
   * @returns Prisma UserUpdateInput for updating an existing user
   */
  static toPrismaUpdateInput(user: User): Prisma.UserUpdateInput {
    const updateInput: Prisma.UserUpdateInput = {
      email: user.getEmail().getValue(),
      password_hash: user.getPasswordHash(),
      role: user.getRole(),
      status: user.getStatus(),
      mfa_enabled: user.isMfaEnabled(),
    };

    // Handle optional fields - only include if they have values
    if (user.getMfaSecret() !== undefined) {
      updateInput.mfa_secret = user.getMfaSecret() ?? null;
    }
    if (user.getFirstName() !== undefined) {
      updateInput.first_name = user.getFirstName() ?? null;
    }
    if (user.getLastName() !== undefined) {
      updateInput.last_name = user.getLastName() ?? null;
    }
    if (user.getPhone() !== undefined) {
      updateInput.phone = user.getPhone() ?? null;
    }
    if (user.getLastLoginAt() !== undefined) {
      updateInput.last_login_at = user.getLastLoginAt() ?? null;
    }

    // updated_at will be set by Prisma automatically
    return updateInput;
  }
}

import { IUserRepository } from '../../../domain/interfaces/repositories/IUserRepository';
import { User } from '../../../domain/entities/User';
import { Email } from '../../../domain/value-objects/Email';
import { UserMapper } from '../../auth/mappers/UserMapper';
import { PrismaClient, Prisma } from '@prisma/client';

/**
 * Repository: PrismaUserRepository
 * 
 * Prisma-based implementation of IUserRepository.
 * This repository handles data persistence for User entities using Prisma ORM.
 * 
 * Responsibilities:
 * - Translate domain operations to Prisma operations
 * - Map between Prisma models and domain entities
 * - Handle database-specific concerns (transactions, errors)
 * - NO business logic - only data access
 * 
 * Clean Architecture Rule: This class depends on domain interfaces and entities,
 * not the other way around. Domain knows nothing about Prisma.
 */
export class PrismaUserRepository implements IUserRepository {
  constructor(private readonly prisma: PrismaClient) {
    if (!prisma) {
      throw new Error('PrismaClient is required');
    }
  }

  /**
   * Finds a user by their unique identifier
   * 
   * @param id - The user's unique identifier
   * @returns Promise resolving to the User entity if found, null otherwise
   */
  async findById(id: string): Promise<User | null> {
    try {
      const prismaUser = await this.prisma.user.findUnique({
        where: { id },
      });

      if (!prismaUser) {
        return null;
      }

      return UserMapper.fromPrisma(prismaUser);
    } catch (error) {
      // Wrap Prisma errors in a more generic error
      throw new Error(`Failed to find user by ID: ${id}. ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Finds a user by their email address
   * 
   * @param email - The user's email address (as Email value object)
   * @returns Promise resolving to the User entity if found, null otherwise
   */
  async findByEmail(email: Email): Promise<User | null> {
    try {
      const prismaUser = await this.prisma.user.findUnique({
        where: { email: email.getValue() },
      });

      if (!prismaUser) {
        return null;
      }

      return UserMapper.fromPrisma(prismaUser);
    } catch (error) {
      // Wrap Prisma errors in a more generic error
      throw new Error(`Failed to find user by email: ${email.getValue()}. ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Saves a new user to the data store
   * 
   * This method handles creation of new users.
   * If a user with the same ID already exists, it will throw an error.
   * 
   * @param user - The User entity to save
   * @returns Promise that resolves when the save operation completes
   * @throws Error if the save operation fails
   */
  async save(user: User): Promise<void> {
    try {
      const createInput = UserMapper.toPrismaCreateInput(user);

      await this.prisma.user.create({
        data: createInput,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          // Unique constraint violation
          throw new Error(`User with ID ${user.getId()} or email ${user.getEmail().getValue()} already exists`);
        }
      }
      // Wrap Prisma errors in a more generic error
      throw new Error(`Failed to save user: ${user.getId()}. ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Updates an existing user in the data store
   * 
   * The user must already exist in the data store.
   * 
   * @param user - The User entity with updated information
   * @returns Promise that resolves when the update operation completes
   * @throws Error if the user does not exist or the update fails
   */
  async update(user: User): Promise<void> {
    try {
      const updateInput = UserMapper.toPrismaUpdateInput(user);

      await this.prisma.user.update({
        where: { id: user.getId() },
        data: updateInput,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          // Record not found
          throw new Error(`User with ID ${user.getId()} not found`);
        }
        if (error.code === 'P2002') {
          // Unique constraint violation (e.g., email already taken)
          throw new Error(`User with email ${user.getEmail().getValue()} already exists`);
        }
      }
      // Wrap Prisma errors in a more generic error
      throw new Error(`Failed to update user: ${user.getId()}. ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

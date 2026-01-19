/**
 * DTO: UserResponseDto
 * 
 * Data Transfer Object for user response data.
 * This DTO represents the output data from user-related use cases.
 */

import { Role } from '../../domain/enums/Role';
import { Status } from '../../domain/enums/Status';

export interface UserResponseDto {
  readonly id: string;
  readonly email: string;
  readonly role: Role;
  readonly status: Status;
  readonly firstName?: string;
  readonly lastName?: string;
  readonly phone?: string;
  readonly mfaEnabled: boolean;
  readonly lastLoginAt?: Date;
  readonly createdAt?: Date;
  readonly updatedAt?: Date;
}

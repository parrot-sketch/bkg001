/**
 * DTO: LoginDto
 * 
 * Data transfer object for user login request.
 */

import { z } from 'zod';

/**
 * Zod schema for login request validation
 */
export const loginDtoSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address')
    .toLowerCase()
    .trim(),
  password: z
    .string()
    .min(1, 'Password is required')
    .min(8, 'Password must be at least 8 characters'),
});

/**
 * Type inferred from Zod schema
 */
export type LoginDto = z.infer<typeof loginDtoSchema>;

/**
 * DTO: LoginResponseDto
 * 
 * Data transfer object for login response.
 */
export interface LoginResponseDto {
  /**
   * JWT access token (short-lived)
   */
  accessToken: string;

  /**
   * JWT refresh token (long-lived)
   */
  refreshToken: string;

  /**
   * Access token expiration time in seconds
   */
  expiresIn: number;

  /**
   * User information
   */
  user: {
    id: string;
    email: string;
    role: string;
    firstName?: string;
    lastName?: string;
  };
}

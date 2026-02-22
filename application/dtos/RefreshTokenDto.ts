/**
 * DTO: RefreshTokenDto
 * 
 * Data transfer object for token refresh request.
 */

import { z } from 'zod';

/**
 * Zod schema for refresh token request validation
 */
export const refreshTokenDtoSchema = z.object({
  refreshToken: z
    .string()
    .min(1, 'Refresh token is required'),
});

/**
 * Type inferred from Zod schema
 */
export type RefreshTokenDto = z.infer<typeof refreshTokenDtoSchema>;

/**
 * DTO: RefreshTokenResponseDto
 * 
 * Data transfer object for token refresh response.
 */
export interface RefreshTokenResponseDto {
  /**
   * New JWT access token (short-lived)
   */
  accessToken: string;

  /**
   * Refresh token (reused)
   */
  refreshToken: string;

  /**
   * Access token expiration time in seconds
   */
  expiresIn: number;
}

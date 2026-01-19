/**
 * DTO: RefreshTokenDto
 * 
 * Data transfer object for token refresh request.
 */
export interface RefreshTokenDto {
  /**
   * Refresh token string
   */
  refreshToken: string;
}

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

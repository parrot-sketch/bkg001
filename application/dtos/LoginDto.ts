/**
 * DTO: LoginDto
 * 
 * Data transfer object for user login request.
 */
export interface LoginDto {
  /**
   * User's email address
   */
  email: string;

  /**
   * User's plain text password
   */
  password: string;
}

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

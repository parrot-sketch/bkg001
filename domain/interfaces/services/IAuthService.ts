import { Email } from '../../value-objects/Email';

/**
 * Service Interface: IAuthService
 * 
 * Defines the contract for authentication operations.
 * This interface represents the "port" in Ports and Adapters architecture.
 * 
 * This service abstracts authentication concerns to enable:
 * - JWT token management
 * - Password hashing and verification
 * - Session management (login/logout)
 * - Token refresh
 * 
 * Implementations of this interface will be provided by the infrastructure layer
 * (e.g., JwtAuthService using jsonwebtoken library and bcrypt/argon2 for password hashing).
 * 
 * Domain Layer Rule: This interface only depends on domain types.
 * No framework, infrastructure, or external dependencies allowed.
 */
export interface IAuthService {
  /**
   * Authenticates a user with email and password
   * 
   * @param email - User's email address (as Email value object)
   * @param password - User's plain text password
   * @returns Promise resolving to JWTToken containing access and refresh tokens
   * @throws Error if authentication fails (invalid credentials, user inactive, etc.)
   */
  login(email: Email, password: string): Promise<JWTToken>;

  /**
   * Logs out a user (invalidates refresh token)
   * 
   * @param userId - User's unique identifier
   * @returns Promise that resolves when logout completes
   */
  logout(userId: string): Promise<void>;

  /**
   * Refreshes an access token using a refresh token
   * 
   * @param refreshToken - Valid refresh token
   * @returns Promise resolving to new JWTToken with updated access token
   * @throws Error if refresh token is invalid or expired
   */
  refreshToken(refreshToken: string): Promise<JWTToken>;

  /**
   * Hashes a plain text password
   * 
   * This method should use a secure hashing algorithm (bcrypt, argon2, etc.)
   * and should include salt generation.
   * 
   * @param password - Plain text password to hash
   * @returns Promise resolving to hashed password string
   */
  hashPassword(password: string): Promise<string>;

  /**
   * Verifies a plain text password against a hash
   * 
   * @param password - Plain text password to verify
   * @param hash - Hashed password to compare against
   * @returns Promise resolving to true if password matches, false otherwise
   */
  verifyPassword(password: string, hash: string): Promise<boolean>;

  /**
   * Verifies and decodes a JWT access token
   * 
   * @param token - JWT access token to verify
   * @returns Promise resolving to TokenPayload containing user ID and role
   * @throws Error if token is invalid or expired
   */
  verifyAccessToken(token: string): Promise<TokenPayload>;
}

/**
 * JWT Token
 * 
 * Represents a JWT token pair (access token and refresh token).
 */
export interface JWTToken {
  /**
   * Access token (short-lived, used for API authentication)
   */
  readonly accessToken: string;

  /**
   * Refresh token (long-lived, used to obtain new access tokens)
   */
  readonly refreshToken: string;

  /**
   * Access token expiration time (in seconds or Date)
   */
  readonly expiresIn: number; // seconds
}

/**
 * Token Payload
 * 
 * Represents the decoded payload of a JWT token.
 */
export interface TokenPayload {
  /**
   * User's unique identifier
   */
  readonly userId: string;

  /**
   * User's email address
   */
  readonly email: string;

  /**
   * User's role
   */
  readonly role: string;

  /**
   * Token issued at (timestamp)
   */
  readonly iat?: number;

  /**
   * Token expiration (timestamp)
   */
  readonly exp?: number;
}

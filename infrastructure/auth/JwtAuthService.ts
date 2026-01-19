import { IAuthService, JWTToken, TokenPayload } from '../../domain/interfaces/services/IAuthService';
import { IUserRepository } from '../../domain/interfaces/repositories/IUserRepository';
import { User } from '../../domain/entities/User';
import { Email } from '../../domain/value-objects/Email';
import { DomainException } from '../../domain/exceptions/DomainException';
import { Role } from '../../domain/enums/Role';
import { DoctorOnboardingStatus, canDoctorAuthenticate } from '../../domain/enums/DoctorOnboardingStatus';
import * as jwt from 'jsonwebtoken';
import * as bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';

/**
 * Configuration for JWT authentication
 * In production, these should come from environment variables
 */
export interface AuthConfig {
  /**
   * Secret key for signing JWT tokens (should be stored in env)
   */
  jwtSecret: string;

  /**
   * Secret key for signing refresh tokens (should be different from jwtSecret)
   */
  jwtRefreshSecret: string;

  /**
   * Access token expiration time in seconds (default: 15 minutes)
   */
  accessTokenExpiresIn?: number;

  /**
   * Refresh token expiration time in seconds (default: 7 days)
   */
  refreshTokenExpiresIn?: number;

  /**
   * Salt rounds for bcrypt password hashing (default: 10)
   */
  saltRounds?: number;
}

/**
 * Service: JwtAuthService
 * 
 * JWT-based implementation of IAuthService.
 * This service handles authentication, token generation, and password management.
 * 
 * Responsibilities:
 * - User authentication (login)
 * - JWT token generation and verification
 * - Password hashing and verification
 * - Refresh token management
 * - Session management (logout)
 * 
 * Security Considerations:
 * - Uses bcrypt for password hashing (configurable salt rounds)
 * - Access tokens are short-lived (default 15 minutes)
 * - Refresh tokens are long-lived (default 7 days) and stored in database
 * - Tokens are signed with HMAC SHA-256
 * - Refresh tokens can be revoked
 * 
 * Clean Architecture Rule: This class depends on domain interfaces,
 * not the other way around. Domain knows nothing about JWT or bcrypt.
 */
export class JwtAuthService implements IAuthService {
  private readonly accessTokenExpiresIn: number;
  private readonly refreshTokenExpiresIn: number;
  private readonly saltRounds: number;

  constructor(
    private readonly userRepository: IUserRepository,
    private readonly prisma: PrismaClient,
    private readonly config: AuthConfig,
  ) {
    if (!config.jwtSecret || config.jwtSecret.trim().length === 0) {
      throw new Error('JWT secret is required');
    }
    if (!config.jwtRefreshSecret || config.jwtRefreshSecret.trim().length === 0) {
      throw new Error('JWT refresh secret is required');
    }

    this.accessTokenExpiresIn = config.accessTokenExpiresIn ?? 15 * 60; // 15 minutes
    this.refreshTokenExpiresIn = config.refreshTokenExpiresIn ?? 7 * 24 * 60 * 60; // 7 days
    this.saltRounds = config.saltRounds ?? 10;
  }

  /**
   * Authenticates a user with email and password
   * 
   * @param email - User's email address (as Email value object)
   * @param password - User's plain text password
   * @returns Promise resolving to JWTToken containing access and refresh tokens
   * @throws DomainException if authentication fails
   */
  async login(email: Email, password: string): Promise<JWTToken> {
    // 1. Find user by email
    const user = await this.userRepository.findByEmail(email);

    if (!user) {
      throw new DomainException('Invalid email or password', {
        email: email.getValue(),
        // Note: Generic error message to prevent user enumeration
      });
    }

    // 2. Check if user can authenticate (status must be ACTIVE)
    if (!user.canAuthenticate()) {
      throw new DomainException('Account is inactive. Please contact administrator', {
        userId: user.getId(),
        status: user.getStatus(),
      });
    }

    // 2.5. ENFORCE DOCTOR IDENTITY INVARIANT
    // If user has role DOCTOR, they MUST have a Doctor profile
    if (user.getRole() === Role.DOCTOR) {
      const doctorProfile = await this.prisma.doctor.findUnique({
        where: { user_id: user.getId() },
        select: { 
          id: true,
          onboarding_status: true,
        },
      });

      if (!doctorProfile) {
        throw new DomainException(
          'Doctor profile not found. Please contact administrator to complete account setup.',
          {
            userId: user.getId(),
            role: user.getRole(),
          }
        );
      }

      // 2.6. ENFORCE DOCTOR ONBOARDING INVARIANT
      // Doctors can only authenticate when onboarding_status === ACTIVE
      const onboardingStatus = doctorProfile.onboarding_status as DoctorOnboardingStatus;
      if (!canDoctorAuthenticate(onboardingStatus)) {
        throw new DomainException(
          'Account onboarding is not complete. Please complete the onboarding process to access the system.',
          {
            userId: user.getId(),
            role: user.getRole(),
            onboardingStatus,
          }
        );
      }
    }

    // 3. Verify password
    const isValidPassword = await this.verifyPassword(password, user.getPasswordHash());

    if (!isValidPassword) {
      throw new DomainException('Invalid email or password', {
        email: email.getValue(),
        // Note: Generic error message to prevent user enumeration
      });
    }

    // 4. Generate tokens
    const tokens = this.generateTokens(user);

    // 5. Store refresh token in database
    await this.storeRefreshToken(user.getId(), tokens.refreshToken, this.refreshTokenExpiresIn);

    // 6. Update last login timestamp
    const updatedUser = await this.updateLastLogin(user);

    // 7. Return tokens
    return tokens;
  }

  /**
   * Logs out a user (invalidates refresh token)
   * 
   * @param userId - User's unique identifier
   * @returns Promise that resolves when logout completes
   */
  async logout(userId: string): Promise<void> {
    // Revoke all refresh tokens for this user
    await this.prisma.refreshToken.updateMany({
      where: {
        user_id: userId,
        revoked: false,
      },
      data: {
        revoked: true,
        revoked_at: new Date(),
      },
    });
  }

  /**
   * Refreshes an access token using a refresh token
   * 
   * @param refreshToken - Valid refresh token
   * @returns Promise resolving to new JWTToken with updated access token
   * @throws DomainException if refresh token is invalid or expired
   */
  async refreshToken(refreshToken: string): Promise<JWTToken> {
    // 1. Verify refresh token
    let payload: TokenPayload;
    try {
      payload = jwt.verify(refreshToken, this.config.jwtRefreshSecret) as TokenPayload;
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        throw new DomainException('Invalid refresh token', {
          error: error.message,
        });
      }
      if (error instanceof jwt.TokenExpiredError) {
        throw new DomainException('Refresh token has expired', {
          expiredAt: error.expiredAt,
        });
      }
      throw new DomainException('Failed to verify refresh token', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }

    // 2. Check if refresh token is revoked in database
    const tokenRecord = await this.prisma.refreshToken.findUnique({
      where: { token: refreshToken },
    });

    if (!tokenRecord || tokenRecord.revoked || tokenRecord.expires_at < new Date()) {
      throw new DomainException('Refresh token is invalid or has been revoked', {
        tokenId: tokenRecord?.id,
      });
    }

    // 3. Get user
    const user = await this.userRepository.findById(payload.userId);

    if (!user) {
      throw new DomainException('User not found', {
        userId: payload.userId,
      });
    }

    // 4. Check if user can still authenticate
    if (!user.canAuthenticate()) {
      throw new DomainException('Account is inactive. Please contact administrator', {
        userId: user.getId(),
        status: user.getStatus(),
      });
    }

    // 5. Generate new access token (reuse refresh token)
    const accessToken = this.generateAccessToken(user);

    return {
      accessToken,
      refreshToken, // Reuse the same refresh token
      expiresIn: this.accessTokenExpiresIn,
    };
  }

  /**
   * Hashes a plain text password using bcrypt
   * 
   * @param password - Plain text password to hash
   * @returns Promise resolving to hashed password string
   */
  async hashPassword(password: string): Promise<string> {
    if (!password || password.trim().length === 0) {
      throw new DomainException('Password cannot be empty', {});
    }

    // Minimum password length check
    if (password.length < 8) {
      throw new DomainException('Password must be at least 8 characters long', {
        providedLength: password.length,
      });
    }

    return await bcrypt.hash(password, this.saltRounds);
  }

  /**
   * Verifies a plain text password against a hash
   * 
   * @param password - Plain text password to verify
   * @param hash - Hashed password to compare against
   * @returns Promise resolving to true if password matches, false otherwise
   */
  async verifyPassword(password: string, hash: string): Promise<boolean> {
    if (!password || !hash) {
      return false;
    }

    try {
      return await bcrypt.compare(password, hash);
    } catch (error) {
      // Log error but don't expose details
      console.error('Password verification error:', error);
      return false;
    }
  }

  /**
   * Verifies and decodes a JWT access token
   * 
   * @param token - JWT access token to verify
   * @returns Promise resolving to TokenPayload containing user ID and role
   * @throws DomainException if token is invalid or expired
   */
  async verifyAccessToken(token: string): Promise<TokenPayload> {
    try {
      const payload = jwt.verify(token, this.config.jwtSecret) as TokenPayload;
      return payload;
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        throw new DomainException('Invalid access token', {
          error: error.message,
        });
      }
      if (error instanceof jwt.TokenExpiredError) {
        throw new DomainException('Access token has expired', {
          expiredAt: error.expiredAt,
        });
      }
      throw new DomainException('Failed to verify access token', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // Private helper methods

  /**
   * Generates JWT tokens (access and refresh) for a user
   * 
   * @param user - User entity
   * @returns JWTToken with access and refresh tokens
   */
  private generateTokens(user: User): JWTToken {
    const accessToken = this.generateAccessToken(user);
    const refreshToken = this.generateRefreshToken(user);

    return {
      accessToken,
      refreshToken,
      expiresIn: this.accessTokenExpiresIn,
    };
  }

  /**
   * Generates an access token for a user
   * 
   * @param user - User entity
   * @returns JWT access token string
   */
  private generateAccessToken(user: User): string {
    const payload: TokenPayload = {
      userId: user.getId(),
      email: user.getEmail().getValue(),
      role: user.getRole(),
    };

    return jwt.sign(payload, this.config.jwtSecret, {
      expiresIn: this.accessTokenExpiresIn,
      issuer: 'hims',
      audience: 'hims-api',
    });
  }

  /**
   * Generates a refresh token for a user
   * 
   * @param user - User entity
   * @returns JWT refresh token string
   */
  private generateRefreshToken(user: User): string {
    const payload: TokenPayload = {
      userId: user.getId(),
      email: user.getEmail().getValue(),
      role: user.getRole(),
    };

    return jwt.sign(payload, this.config.jwtRefreshSecret, {
      expiresIn: this.refreshTokenExpiresIn,
      issuer: 'hims',
      audience: 'hims-api',
    });
  }

  /**
   * Stores a refresh token in the database
   * 
   * @param userId - User's unique identifier
   * @param token - Refresh token string
   * @param expiresInSeconds - Token expiration in seconds
   */
  private async storeRefreshToken(userId: string, token: string, expiresInSeconds: number): Promise<void> {
    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + expiresInSeconds);

    await this.prisma.refreshToken.create({
      data: {
        user_id: userId,
        token,
        expires_at: expiresAt,
        revoked: false,
      },
    });
  }

  /**
   * Updates the last login timestamp for a user
   * 
   * @param user - User entity
   * @returns Updated User entity
   */
  private async updateLastLogin(user: User): Promise<User> {
    const updatedUser = User.create({
      id: user.getId(),
      email: user.getEmail(),
      passwordHash: user.getPasswordHash(),
      role: user.getRole(),
      status: user.getStatus(),
      mfaEnabled: user.isMfaEnabled(),
      mfaSecret: user.getMfaSecret(),
      firstName: user.getFirstName(),
      lastName: user.getLastName(),
      phone: user.getPhone(),
      lastLoginAt: new Date(),
      createdAt: user.getCreatedAt(),
      updatedAt: new Date(),
    });

    await this.userRepository.update(updatedUser);
    return updatedUser;
  }
}

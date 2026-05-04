import { IAuthService, JWTToken, TokenPayload } from '../../domain/interfaces/services/IAuthService';
import { IUserRepository } from '../../domain/interfaces/repositories/IUserRepository';
import { User } from '../../domain/entities/User';
import { Email } from '../../domain/value-objects/Email';
import { DomainException } from '../../domain/exceptions/DomainException';
import { Role } from '../../domain/enums/Role';
import { DoctorOnboardingStatus, canDoctorAuthenticate } from '../../domain/enums/DoctorOnboardingStatus';
import jwt from 'jsonwebtoken';
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
  /**
   * Pre-computed bcrypt hash used for timing-attack normalisation.
   *
   * This is a static constant so it is NEVER computed at runtime.
   * Previously this was computed synchronously in the constructor via
   * bcrypt.hashSync(), which blocked the Node.js event loop for ~100 ms
   * on every Lambda cold start (P0-3 fix).
   *
   * The value below is a real bcrypt hash of a random string at rounds=10.
   * It does not need to be a secret — it will never match a real password.
   */
  private static readonly DUMMY_HASH =
    '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lh3y';

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
    // ─── 1. Single DB fetch — get everything needed in one round-trip ───────────
    // This replaces the previous pattern of 3 separate reads of the same row.
    const user = await this.userRepository.findByEmail(email);

    // ─── 2. Always run bcrypt (real or dummy) for constant-time response ────────
    const passwordHashToCompare = user ? user.getPasswordHash() : JwtAuthService.DUMMY_HASH;
    const isValidPassword = await this.verifyPassword(password, passwordHashToCompare);

    // ─── 3. Random jitter (0-50ms) against probabilistic timing analysis ────────
    const jitter = Math.floor(Math.random() * 50);
    await new Promise(resolve => setTimeout(resolve, jitter));

    if (!user || !isValidPassword) {
      const maskedEmail = email.getValue().replace(/(.{2}).+(@.+)/, '$1***$2');
      console.warn(`[SECURITY:FAILED_LOGIN] Invalid credentials attempt | Email: ${maskedEmail}`);

      // Atomic increment — no separate SELECT needed, eliminates the race condition
      // where two concurrent failures both read the same count and both write n+1.
      await this.prisma.$executeRaw`
        UPDATE "User"
        SET
          failed_login_attempts = failed_login_attempts + 1,
          locked_until = CASE
            WHEN failed_login_attempts + 1 >= 5
              THEN NOW() + INTERVAL '15 minutes'
            ELSE locked_until
          END
        WHERE id = ${user?.getId() ?? ''}
      `.catch(() => {}); // Fire-and-forget: failure here must not block the 401

      throw new DomainException('Invalid email or password', {});
    }

    // ─── 4. Status check ────────────────────────────────────────────────────────
    if (!user.canAuthenticate()) {
      console.warn(`[SECURITY:FAILED_LOGIN] Inactive account | UserId: ${user.getId()}`);
      throw new DomainException('Account is inactive. Please contact administrator', {
        userId: user.getId(),
        status: user.getStatus(),
      });
    }

    // ─── 5. Doctor invariant check (role=DOCTOR only) ───────────────────────────
    if (user.getRole() === Role.DOCTOR) {
      const doctorProfile = await this.prisma.doctor.findUnique({
        where: { user_id: user.getId() },
        select: { id: true, onboarding_status: true },
      });

      if (!doctorProfile) {
        console.warn(`[SECURITY:FAILED_LOGIN] Missing doctor profile | UserId: ${user.getId()}`);
        throw new DomainException(
          'Doctor profile not found. Please contact administrator to complete account setup.',
          { userId: user.getId(), role: user.getRole() }
        );
      }

      const onboardingStatus = doctorProfile.onboarding_status as DoctorOnboardingStatus;
      if (!canDoctorAuthenticate(onboardingStatus)) {
        console.warn(`[SECURITY:FAILED_LOGIN] Incomplete onboarding | UserId: ${user.getId()} | Status: ${onboardingStatus}`);
        throw new DomainException(
          'Account onboarding is not complete. Please complete the onboarding process to access the system.',
          { userId: user.getId(), role: user.getRole(), onboardingStatus }
        );
      }
    }

    // ─── 6. Generate tokens ─────────────────────────────────────────────────────
    const tokens = this.generateTokens(user);

    // ─── 7 & 8. Parallelize: store refresh token + reset lockout + last_login ───
    // Previously 3 sequential round-trips. Now 2 parallel ones.
    await Promise.all([
      this.storeRefreshToken(user.getId(), tokens.refreshToken, this.refreshTokenExpiresIn),
      // Single UPDATE replaces the previous separate reset-failed-count write AND
      // the separate updateLastLogin write (was a full User.create + repo.update).
      this.prisma.user.update({
        where: { id: user.getId() },
        data: {
          failed_login_attempts: 0,
          locked_until: null,
          last_login_at: new Date(),
        },
      }),
    ]);

    // ─── 9. Non-blocking token cleanup (probabilistic — 1% of logins) ───────────
    if (Math.random() < 0.01) {
      this.cleanupExpiredTokens().catch(err => {
        console.error(`[SECURITY:CLEANUP_ERROR] ${err instanceof Error ? err.message : String(err)}`);
      });
    }

    console.info(`[SECURITY:SUCCESSFUL_LOGIN] UserId: ${user.getId()} | Role: ${user.getRole()}`);

    return {
      ...tokens,
      authenticatedUser: {
        id: user.getId(),
        email: user.getEmail().getValue(),
        role: user.getRole(),
        firstName: user.getFirstName(),
        lastName: user.getLastName(),
      },
    };
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
   * Cleans up expired and revoked refresh tokens from the database.
   * Should be called periodically (e.g. daily cron or on each login).
   * Prevents unbounded growth of the RefreshToken table.
   *
   * @returns Promise resolving to the number of deleted tokens
   */
  async cleanupExpiredTokens(): Promise<number> {
    const result = await this.prisma.refreshToken.deleteMany({
      where: {
        OR: [
          { expires_at: { lt: new Date() } },     // Expired
          { revoked: true },                        // Revoked
        ],
      },
    });
    return result.count;
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

    console.info(`[SECURITY:TOKEN_REFRESH] Successfully refreshed token | UserId: ${user.getId()} | Role: ${user.getRole()}`);

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

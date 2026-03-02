/**
 * Authentication Testing Utilities
 * 
 * Centralized testing utilities for auth-related tests.
 * Provides factories, mocks, and helpers for unit, integration, and E2E tests.
 */

import { beforeEach, vi } from 'vitest';
import { JwtAuthService } from '@/infrastructure/auth/JwtAuthService';
import { User } from '@/domain/entities/User';
import { Email } from '@/domain/value-objects/Email';
import { Role } from '@/domain/enums/Role';
import { Status } from '@/domain/enums/Status';
import * as bcrypt from 'bcrypt';

/**
 * Test Auth Configuration
 * Uses short token lifespans for faster testing
 */
export const testAuthConfig = {
  jwtSecret: 'test-secret-key-at-least-32-characters-long-for-testing',
  jwtRefreshSecret: 'test-refresh-secret-at-least-32-characters-for-testing',
  accessTokenExpiresIn: 15 * 60,   // 15 minutes
  refreshTokenExpiresIn: 7 * 24 * 60 * 60,  // 7 days
  saltRounds: 10,
};

/**
 * Test User Factory
 * Creates test users with various configurations
 */
export class TestUserFactory {
  private static counter = 0;

  static async createUserEntity(overrides?: Partial<{
    email: string;
    firstName: string;
    lastName: string;
    role: Role;
    password: string;
  }>): Promise<User> {
    const counter = TestUserFactory.counter++;
    const email = overrides?.email || `test-user-${counter}@example.com`;
    const password = overrides?.password || 'test-password-123';
    const passwordHash = await bcrypt.hash(password, testAuthConfig.saltRounds);

    return User.create({
      id: `test-user-${counter}`,
      email: Email.create(email),
      firstName: overrides?.firstName || 'Test',
      lastName: overrides?.lastName || 'User',
      passwordHash,
      role: overrides?.role || Role.PATIENT,
      status: Status.ACTIVE,
    });
  }

  static async createDoctorUser(overrides?: Partial<{
    email: string;
    firstName: string;
    lastName: string;
  }>): Promise<User> {
    return this.createUserEntity({
      ...overrides,
      role: Role.DOCTOR,
    });
  }

  static async createNurseUser(overrides?: Partial<{
    email: string;
    firstName: string;
    lastName: string;
  }>): Promise<User> {
    return this.createUserEntity({
      ...overrides,
      role: Role.NURSE,
    });
  }

  static async createAdminUser(overrides?: Partial<{
    email: string;
    firstName: string;
    lastName: string;
  }>): Promise<User> {
    return this.createUserEntity({
      ...overrides,
      role: Role.ADMIN,
    });
  }

  /**
   * Reset counter for test isolation
   */
  static resetCounter(): void {
    TestUserFactory.counter = 0;
  }
}

/**
 * Mock User Repository
 * For unit testing JwtAuthService without database
 */
export class MockUserRepository {
  private users: Map<string, User> = new Map();
  private findByEmailMock = vi.fn();
  private findByIdMock = vi.fn();

  async findByEmail(email: Email): Promise<User | null> {
    return this.findByEmailMock(email);
  }

  async findById(id: string): Promise<User | null> {
    return this.findByIdMock(id);
  }

  async save(user: User): Promise<void> {
    this.users.set(user.getId(), user);
  }

  async update(user: User): Promise<void> {
    this.users.set(user.getId(), user);
  }

  async delete(id: string): Promise<void> {
    this.users.delete(id);
  }

  /**
   * Setup helper: Add a user to the mock repository
   */
  setUser(user: User): void {
    this.users.set(user.getId(), user);
    this.findByEmailMock.mockResolvedValue(user);
    this.findByIdMock.mockResolvedValue(user);
  }

  /**
   * Setup helper: Mock user not found
   */
  setUserNotFound(): void {
    this.findByEmailMock.mockResolvedValue(null);
  }

  /**
   * Get the mocked methods (for verification)
   */
  getMocks() {
    return {
      findByEmail: this.findByEmailMock,
      findById: this.findByIdMock,
    };
  }

  /**
   * Reset all mocks
   */
  reset(): void {
    this.users.clear();
    this.findByEmailMock.mockReset();
    this.findByIdMock.mockReset();
  }
}

/**
 * Mock Prisma Client
 * For unit testing that requires database calls
 */
export const mockPrismaClient = {
  user: {
    create: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    findMany: vi.fn(),
  },
  refreshToken: {
    create: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    delete: vi.fn(),
    deleteMany: vi.fn(),
  },
  doctor: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
  },
  $transaction: vi.fn(async (fn: any) => fn()),
  $disconnect: vi.fn(),
};

/**
 * Authentication Test Setup
 * Call in beforeEach() for test isolation
 */
export function setupAuthTests(): {
  mockUserRepository: MockUserRepository;
  mockPrisma: typeof mockPrismaClient;
  reset: () => void;
} {
  const mockUserRepository = new MockUserRepository();
  
  return {
    mockUserRepository,
    mockPrisma: mockPrismaClient,
    reset: () => {
      TestUserFactory.resetCounter();
      mockUserRepository.reset();
      vi.clearAllMocks();
    },
  };
}

/**
 * JWT Token Decoder
 * Decodes JWT without verification (for testing)
 */
export function decodeJwt(token: string): {
  header: Record<string, any>;
  payload: Record<string, any>;
  signature: string;
} {
  const [headerB64, payloadB64, signature] = token.split('.');
  
  const header = JSON.parse(Buffer.from(headerB64, 'base64').toString());
  const payload = JSON.parse(Buffer.from(payloadB64, 'base64').toString());

  return { header, payload, signature };
}

/**
 * Assert JWT Token Valid
 */
export function assertValidJwt(token: string): void {
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('Invalid JWT format: expected 3 parts separated by dots');
  }

  const { payload } = decodeJwt(token);
  
  if (!payload.userId) {
    throw new Error('Invalid JWT: missing userId claim');
  }

  if (!payload.email) {
    throw new Error('Invalid JWT: missing email claim');
  }

  if (!payload.exp) {
    throw new Error('Invalid JWT: missing exp claim');
  }

  if (payload.exp * 1000 < Date.now()) {
    throw new Error('Invalid JWT: token is expired');
  }
}

/**
 * Test Helper: Login Response
 */
export interface TestLoginResponse {
  success: boolean;
  user?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: Role;
  };
  tokens?: {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  };
  error?: string;
}

/**
 * Test Helper: Create Auth Headers
 */
export function createAuthHeaders(token: string): Record<string, string> {
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

/**
 * Test Helper: Assert Auth Error
 */
export function assertAuthError(
  error: any,
  expectedMessage: string | RegExp
): void {
  if (typeof expectedMessage === 'string') {
    if (error.message !== expectedMessage) {
      throw new Error(`Expected error message "${expectedMessage}" but got "${error.message}"`);
    }
  } else {
    if (!expectedMessage.test(error.message)) {
      throw new Error(`Expected error message matching ${expectedMessage} but got "${error.message}"`);
    }
  }
}

/**
 * Test Helper: Wait for token expiration
 * Useful for testing token refresh logic
 */
export async function waitForTokenExpiration(ms: number = 100): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Test Data: Sample Credentials
 */
export const testCredentials = {
  validDoctor: {
    email: 'doctor@example.com',
    password: 'DoctorPassword123!',
  },
  validNurse: {
    email: 'nurse@example.com',
    password: 'NursePassword123!',
  },
  validPatient: {
    email: 'patient@example.com',
    password: 'PatientPassword123!',
  },
  invalidPassword: 'WrongPassword123!',
  invalidEmail: 'nonexistent@example.com',
};

export default {
  testAuthConfig,
  TestUserFactory,
  MockUserRepository,
  mockPrismaClient,
  setupAuthTests,
  decodeJwt,
  assertValidJwt,
  createAuthHeaders,
  assertAuthError,
  waitForTokenExpiration,
  testCredentials,
};

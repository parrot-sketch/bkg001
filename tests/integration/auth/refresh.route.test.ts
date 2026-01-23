/**
 * Integration Tests: POST /api/auth/refresh
 * 
 * Tests the token refresh API route with a real database connection.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { POST } from '@/app/api/auth/refresh/route';
import { NextRequest } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { JwtAuthService } from '@/infrastructure/auth/JwtAuthService';
import { PrismaUserRepository } from '@/infrastructure/database/repositories/PrismaUserRepository';
import { Role } from '@/domain/enums/Role';
import { Status } from '@/domain/enums/Status';
import { Email } from '@/domain/value-objects/Email';
import { User } from '@/domain/entities/User';

describe('POST /api/auth/refresh', () => {
  let prisma: PrismaClient;
  let authService: JwtAuthService;
  let testUser: User;
  let refreshToken: string;

  beforeAll(async () => {
    prisma = new PrismaClient();
    const userRepository = new PrismaUserRepository(prisma);
    
    authService = new JwtAuthService(userRepository, prisma, {
      jwtSecret: process.env.JWT_SECRET || 'test-secret',
      jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || 'test-refresh-secret',
      accessTokenExpiresIn: 900,
      refreshTokenExpiresIn: 604800,
      saltRounds: 10,
    });
  });

  beforeEach(async () => {
    // Clean up
    await prisma.user.deleteMany({
      where: {
        email: 'test-refresh@example.com',
      },
    });
    await prisma.refreshToken.deleteMany({
      where: {
        user_id: {
          in: await prisma.user
            .findMany({
              where: { email: 'test-refresh@example.com' },
              select: { id: true },
            })
            .then((users) => users.map((u) => u.id)),
        },
      },
    });

    // Create test user and get refresh token
    const email = Email.create('test-refresh@example.com');
    const passwordHash = await authService.hashPassword('Password123!');
    
    testUser = User.create({
      id: crypto.randomUUID(),
      email,
      passwordHash,
      role: Role.PATIENT,
      status: Status.ACTIVE,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const userRepository = new PrismaUserRepository(prisma);
    await userRepository.save(testUser);

    // Generate refresh token
    const tokens = await authService.login(email, 'Password123!');
    refreshToken = tokens.refreshToken;
  });

  afterAll(async () => {
    await prisma.refreshToken.deleteMany({
      where: {
        user_id: testUser.getId(),
      },
    });
    await prisma.user.deleteMany({
      where: {
        email: 'test-refresh@example.com',
      },
    });
    await prisma.$disconnect();
  });

  describe('Successful Token Refresh', () => {
    it('should return new access and refresh tokens', async () => {
      // Arrange
      const request = new NextRequest('http://localhost:3000/api/auth/refresh', {
        method: 'POST',
        body: JSON.stringify({
          refreshToken,
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('accessToken');
      expect(data.data).toHaveProperty('refreshToken');
      expect(data.data).toHaveProperty('expiresIn');
      expect(typeof data.data.accessToken).toBe('string');
      expect(data.data.accessToken.length).toBeGreaterThan(0);
      // New refresh token should be different
      expect(data.data.refreshToken).not.toBe(refreshToken);
    });
  });

  describe('Invalid Refresh Token', () => {
    it('should return 401 for invalid refresh token', async () => {
      // Arrange
      const request = new NextRequest('http://localhost:3000/api/auth/refresh', {
        method: 'POST',
        body: JSON.stringify({
          refreshToken: 'invalid-token',
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
    });

    it('should return 400 for missing refresh token', async () => {
      // Arrange
      const request = new NextRequest('http://localhost:3000/api/auth/refresh', {
        method: 'POST',
        body: JSON.stringify({}),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('required');
    });
  });
});

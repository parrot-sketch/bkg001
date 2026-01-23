/**
 * Integration Tests: POST /api/auth/login
 * 
 * Tests the login API route with a real database connection.
 * These tests verify the full request/response cycle.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { POST } from '@/app/api/auth/login/route';
import { NextRequest } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { JwtAuthService } from '@/infrastructure/auth/JwtAuthService';
import { PrismaUserRepository } from '@/infrastructure/database/repositories/PrismaUserRepository';
import { Role } from '@/domain/enums/Role';
import { Status } from '@/domain/enums/Status';
import { Email } from '@/domain/value-objects/Email';
import { User } from '@/domain/entities/User';

describe('POST /api/auth/login', () => {
  let prisma: PrismaClient;
  let authService: JwtAuthService;
  let testUser: User;
  let testPassword: string;

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
    // Clean up test users
    await prisma.user.deleteMany({
      where: {
        email: {
          in: ['test-login@example.com', 'test-inactive@example.com'],
        },
      },
    });

    // Create test user
    testPassword = 'TestPassword123!';
    const email = Email.create('test-login@example.com');
    const passwordHash = await authService.hashPassword(testPassword);
    
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
  });

  afterAll(async () => {
    // Clean up
    await prisma.user.deleteMany({
      where: {
        email: {
          in: ['test-login@example.com', 'test-inactive@example.com'],
        },
      },
    });
    await prisma.$disconnect();
  });

  describe('Successful Login', () => {
    it('should return tokens and user data for valid credentials', async () => {
      // Arrange
      const request = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test-login@example.com',
          password: testPassword,
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
      expect(data.data).toHaveProperty('user');
      expect(data.data.user.email).toBe('test-login@example.com');
      expect(data.data.user.role).toBe(Role.PATIENT);
      expect(typeof data.data.accessToken).toBe('string');
      expect(data.data.accessToken.length).toBeGreaterThan(0);
    });
  });

  describe('Invalid Credentials', () => {
    it('should return 401 for invalid password', async () => {
      // Arrange
      const request = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test-login@example.com',
          password: 'wrong-password',
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
      expect(data.error).toContain('Invalid email or password');
    });

    it('should return 401 for non-existent email', async () => {
      // Arrange
      const request = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: 'nonexistent@example.com',
          password: 'password',
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
      expect(data.error).toContain('Invalid email or password');
    });
  });

  describe('Request Validation', () => {
    it('should return 400 for missing email', async () => {
      // Arrange
      const request = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          password: 'password',
        }),
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

    it('should return 400 for missing password', async () => {
      // Arrange
      const request = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
        }),
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

    it('should return 400 for invalid JSON', async () => {
      // Arrange
      const request = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: 'invalid json',
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
      expect(data.error).toContain('Invalid JSON');
    });
  });
});

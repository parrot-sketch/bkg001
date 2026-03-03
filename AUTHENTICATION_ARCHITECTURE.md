# Authentication Architecture
## HIMS - JWT + bcrypt Implementation

**Version:** 1.0  
**Status:** Production Ready  
**Last Updated:** March 2, 2026

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [System Overview](#system-overview)
3. [Architecture & Design](#architecture--design)
4. [Security Model](#security-model)
5. [Token Lifecycle](#token-lifecycle)
6. [Implementation Details](#implementation-details)
7. [Role-Based Access Control (RBAC)](#role-based-access-control-rbac)
8. [Testing Strategy](#testing-strategy)
9. [Configuration Guide](#configuration-guide)
10. [Troubleshooting](#troubleshooting)
11. [Migration from Third-Party Auth](#migration-from-third-party-auth)

---

## Executive Summary

HIMS implements a **custom JWT + bcrypt authentication system** that provides:

✅ **No vendor lock-in** - Complete control over authentication flow  
✅ **HIPAA Compliant** - Meets healthcare security requirements  
✅ **Stateless Sessions** - JWT tokens are stateless and scalable  
✅ **Flexible RBAC** - Role-based access control fully customizable  
✅ **Secure by Default** - bcrypt hashing + JWT signing with configurable options  
✅ **Token Refresh** - Built-in token rotation with refresh tokens  

**Key Components:**
- `JwtAuthService` - Core authentication service (login, logout, token generation)
- `JwtMiddleware` - Request authentication and JWT verification
- `useAuth()` hook - Frontend authentication state management
- `AuthContext` - Global authentication state provider
- `getCurrentUser()` - Server-side user retrieval with silent refresh

---

## System Overview

### 1.1 Architecture Diagram

```
┌──────────────────────────────────────────────────────────────┐
│                    Client Application                        │
│  ┌────────────┐  ┌─────────────┐  ┌──────────────────────┐ │
│  │ Login Form │→ │ useAuth()   │→ │ AuthContext Provider │ │
│  └────────────┘  └─────────────┘  └──────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
                          ↓ (POST /api/auth/login)
┌──────────────────────────────────────────────────────────────┐
│                    API Layer (Route Handlers)                │
│  ┌──────────────────────────────────────────────────────────┐│
│  │ POST /api/auth/login                                      ││
│  │  1. Validate email & password (schema)                    ││
│  │  2. Load User from database                               ││
│  │  3. Verify password (bcrypt.compare)                      ││
│  │  4. Check user status & roles                             ││
│  │  5. Generate JWT tokens (access + refresh)                ││
│  │  6. Return tokens in httpOnly cookies + response body     ││
│  └──────────────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────────────┘
                          ↓ (Access Token + Refresh Token)
┌──────────────────────────────────────────────────────────────┐
│              Application & Infrastructure Layer               │
│  ┌──────────────────────────────────────────────────────────┐│
│  │ JwtAuthService (IAuthService Implementation)              ││
│  │  - login(email, password): Promise<JWTToken>              ││
│  │  - logout(userId): Promise<void>                          ││
│  │  - verifyToken(token): Promise<TokenPayload>              ││
│  │  - refreshToken(refreshToken): Promise<JWTToken>          ││
│  └──────────────────────────────────────────────────────────┘│
│  ┌──────────────────────────────────────────────────────────┐│
│  │ JwtMiddleware (Token Verification)                        ││
│  │  - authenticate(request): Promise<AuthContext>            ││
│  │  - Extracts token from Authorization header or cookie ││
│  │  - Verifies signature & expiration                        ││
│  │  - Returns user context for route handlers                ││
│  └──────────────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────────────┘
                          ↓
┌──────────────────────────────────────────────────────────────┐
│                    Domain Layer                              │
│  ┌──────────────────────────────────────────────────────────┐│
│  │ User Entity                                               ││
│  │  - id: string                                             ││
│  │  - email: Email (value object)                            ││
│  │  - passwordHash: string (bcrypt)                          ││
│  │  - role: Role (enum: ADMIN, DOCTOR, NURSE, etc.)          ││
│  │  - status: UserStatus (ACTIVE, INACTIVE, etc.)            ││
│  │  - canAuthenticate(): boolean                             ││
│  └──────────────────────────────────────────────────────────┘│
│  ┌──────────────────────────────────────────────────────────┐│
│  │ IAuthService (Interface - no implementation)              ││
│  │  - All methods are contracts only                         ││
│  │  - Implementation provided by infrastructure layer        ││
│  └──────────────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────────────┘
                          ↓
┌──────────────────────────────────────────────────────────────┐
│              Infrastructure & Database Layer                 │
│  ┌──────────────────────────────────────────────────────────┐│
│  │ PrismaUserRepository (IUserRepository Implementation)      ││
│  │  - findByEmail(email): Promise<User>                      ││
│  │  - findById(id): Promise<User>                            ││
│  │  - save(user): Promise<void>                              ││
│  │  - update(user): Promise<void>                            ││
│  └──────────────────────────────────────────────────────────┘│
│  ┌──────────────────────────────────────────────────────────┐│
│  │ PostgreSQL Database                                       ││
│  │  - users table (id, email, password_hash, role, status)   ││
│  │  - refresh_tokens table (user_id, token, expires_at)      ││
│  └──────────────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────────────┘
```

### 1.2 Component Interactions

```
┌─────────────────────────────────────────────────────────────────┐
│                          LOGIN FLOW                            │
└─────────────────────────────────────────────────────────────────┘

User enters email & password
        ↓
POST /api/auth/login
        ↓
Route Handler validates input (Zod schema)
        ↓
JwtAuthService.login(email, password)
        ↓
IUserRepository.findByEmail(email)
        ↓
User found? Check bcrypt.compare(password, passwordHash)
        ↓
Password matches? Verify user status & roles
        ↓
Generate JWT tokens (access + refresh)
        ↓
Create RefreshToken record in database
        ↓
Return tokens in httpOnly cookies + response body
        ↓
Frontend stores tokens, updates AuthContext
        ↓
User authenticated ✅
```

---

## Architecture & Design

### 2.1 Clean Architecture Layers

HIMS authentication follows **Clean Architecture principles** with clear layer separation:

#### Domain Layer (No Dependencies)
```typescript
// domain/interfaces/services/IAuthService.ts
export interface IAuthService {
  login(email: Email, password: string): Promise<JWTToken>;
  logout(userId: string): Promise<void>;
  verifyToken(token: string): Promise<TokenPayload>;
  refreshToken(refreshToken: string): Promise<JWTToken>;
}

// domain/entities/User.ts
export class User {
  static create(params: CreateUserParams): User {
    // Factory method with validation
    if (!params.email) throw new ValidationException('...');
    // ...
    return new User(...);
  }

  canAuthenticate(): boolean {
    return this.status === UserStatus.ACTIVE;
  }
}
```

#### Application Layer (Domain Dependencies)
```typescript
// infrastructure/auth/JwtAuthService.ts (implements IAuthService)
export class JwtAuthService implements IAuthService {
  constructor(
    private readonly userRepository: IUserRepository,  // Domain interface
    private readonly prisma: PrismaClient,
    private readonly config: AuthConfig,
  ) {}

  async login(email: Email, password: string): Promise<JWTToken> {
    // 1. Load User entity from repository
    const user = await this.userRepository.findByEmail(email);
    
    // 2. Delegate password verification to User entity (domain logic)
    if (!user.canAuthenticate()) {
      throw new DomainException('Account inactive');
    }

    // 3. Verify password (bcrypt)
    const passwordMatches = await bcrypt.compare(password, user.getPasswordHash());
    if (!passwordMatches) {
      throw new DomainException('Invalid credentials');
    }

    // 4. Generate tokens (stateless)
    const accessToken = this.generateAccessToken(user);
    const refreshToken = this.generateRefreshToken(user);

    // 5. Persist refresh token to database (for revocation)
    await this.prisma.refreshToken.create({
      data: {
        token: refreshToken,
        user_id: user.getId(),
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    return { accessToken, refreshToken };
  }
}
```

#### Infrastructure Layer
```typescript
// infrastructure/repositories/PrismaUserRepository.ts
export class PrismaUserRepository implements IUserRepository {
  async findByEmail(email: Email): Promise<User | null> {
    const raw = await this.db.user.findUnique({
      where: { email: email.getValue() },
    });
    return raw ? UserMapper.fromPrisma(raw) : null;
  }
}
```

#### Interface Layer (API Routes)
```typescript
// app/api/auth/login/route.ts
export async function POST(request: NextRequest) {
  try {
    // 1. Parse & validate input
    const body = await request.json();
    const validation = loginSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: '...' }, { status: 400 });
    }

    // 2. Instantiate use case with dependencies
    const authService = new JwtAuthService(
      new PrismaUserRepository(db),
      db,
      authConfig,
    );

    // 3. Call use case (application logic)
    const tokens = await authService.login(
      Email.create(validation.data.email),
      validation.data.password,
    );

    // 4. Set httpOnly cookies (secure)
    const response = NextResponse.json({ success: true });
    response.cookies.set('accessToken', tokens.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 15 * 60, // 15 minutes
    });

    return response;
  } catch (error) {
    // Handle errors
    return handleAuthError(error);
  }
}
```

### 2.2 Design Patterns

#### 1. **Adapter Pattern** (Infrastructure Adapts Domain)
```typescript
// Domain defines what auth should do
interface IAuthService {
  login(email: Email, password: string): Promise<JWTToken>;
}

// Infrastructure provides JWT implementation
class JwtAuthService implements IAuthService {
  // ...
}
```

#### 2. **Dependency Injection**
```typescript
// Pass dependencies, don't create them
const authService = new JwtAuthService(
  userRepository,  // injected
  prismaClient,    // injected
  authConfig,      // injected
);
```

#### 3. **Repository Pattern** (Data Access Abstraction)
```typescript
// Domain interface (no implementation)
interface IUserRepository {
  findByEmail(email: Email): Promise<User | null>;
}

// Infrastructure implements
class PrismaUserRepository implements IUserRepository {
  async findByEmail(email: Email): Promise<User | null> {
    // Prisma-specific implementation
  }
}
```

#### 4. **Value Object Pattern**
```typescript
export class Email {
  constructor(private readonly value: string) {
    if (!isValidEmail(value)) {
      throw new ValidationException(`Invalid email: ${value}`);
    }
  }

  getValue(): string {
    return this.value;
  }

  equals(other: Email): boolean {
    return this.value === other.value;
  }
}

// Usage
const email = Email.create('user@example.com'); // Validated
```

#### 5. **Factory Pattern**
```typescript
// User entity creation with validation
export class User {
  static create(params: CreateUserParams): User {
    // Validate all invariants
    if (!params.email) throw new ValidationException('...');
    
    // Return initialized instance
    return new User(uuid(), params.email, params.passwordHash, ...);
  }
}
```

---

## Security Model

### 3.1 Password Security

**Hashing Algorithm: bcrypt**

```typescript
// During registration/password creation
const passwordHash = await bcrypt.hash(plainPassword, 10);
// Salt rounds: 10 (configurable, default recommended)
// Cost: ~100ms per hash on modern hardware

// During login (verification)
const isValid = await bcrypt.compare(plainPassword, storedHash);
// Takes ~100ms, constant-time comparison (prevents timing attacks)
```

**Security Properties:**
- ✅ Automatic salt generation
- ✅ Impossible to reverse (one-way hashing)
- ✅ Constant-time comparison (prevents timing attacks)
- ✅ Configurable work factor (saltRounds) for future-proofing
- ✅ OWASP compliant

### 3.2 JWT Security

**Token Structure:**
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.
eyJ1c2VySWQiOiIxMjMiLCJlbWFpbCI6InVzZXJAZXhhbXBsZS5jb20iLCJyb2xlIjoiRE9DVE9SIiwiaWF0IjoxNjc4ODExMjAwLCJleHAiOjE2Nzg4MTI5MDB9.
4RwbMzr7xN8v5p2xK3mL8qR6sT9uY2wZ1aB3cD4eF5g
```

**Payload:**
```typescript
{
  userId: "user-123",           // User identifier
  email: "user@example.com",    // User email (for JWT verification)
  role: "DOCTOR",               // User role (RBAC)
  iat: 1678811200,              // Issued At (Unix timestamp)
  exp: 1678812900,              // Expiration (15 minutes)
}
```

**Security Configuration:**
```typescript
{
  jwtSecret: process.env.JWT_SECRET,                    // Min 32 characters
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET,     // Different key
  accessTokenExpiresIn: 15 * 60,                         // 15 minutes (short-lived)
  refreshTokenExpiresIn: 7 * 24 * 60 * 60,             // 7 days
  saltRounds: 10,                                       // bcrypt work factor
}
```

### 3.3 Token Expiration & Refresh

**Access Token Lifecycle:**
```
Access Token issued
  ↓ (valid for 15 minutes)
Expired? Client calls refresh endpoint
  ↓
JwtAuthService.refreshToken(refreshToken)
  ↓
Verify refresh token signature & expiration
  ↓
Check refresh token in database (for revocation)
  ↓
Generate new access token + refresh token
  ↓
Update cookies, return new tokens
  ↓
Client continues authenticated
```

**Refresh Token Security:**
- Stored in HTTPS-only cookies
- Persisted in database (can be revoked)
- Longer TTL (7 days) but must be rotated regularly
- Database entry deleted on logout

### 3.4 HTTPS & Cookie Security

```typescript
// httpOnly cookies (inaccessible to JavaScript)
response.cookies.set('accessToken', token, {
  httpOnly: true,                    // ✅ JS cannot access (XSS protection)
  secure: NODE_ENV === 'production', // ✅ HTTPS only in production
  sameSite: 'lax',                   // ✅ CSRF protection
  path: '/',
  maxAge: 15 * 60,                   // ✅ Expires in 15 minutes
});
```

### 3.5 HIPAA Compliance

✅ **Authentication Logging**
- All login attempts logged (successful + failed)
- Timestamps recorded
- User IDs tracked

✅ **Transport Security**
- HTTPS enforced in production
- TLS 1.3+
- Certificate validation

✅ **Access Control**
- Role-based access control (RBAC)
- Patient data isolation
- Audit trails for all data access

✅ **Session Management**
- Automatic timeout (15 min access token)
- Logout on role change
- Session invalidation on suspicious activity

---

## Token Lifecycle

### 4.1 Complete Token Flow

```
┌────────────────────────────────────────────────────────────┐
│                    LOGIN SEQUENCE                          │
└────────────────────────────────────────────────────────────┘

1. User submits credentials
   POST /api/auth/login
   Body: { email: "user@example.com", password: "..." }

2. Route handler validates input
   ✓ Email format valid
   ✓ Password length > 6
   ✓ Both fields present

3. JwtAuthService.login() executes
   a) Find user by email in database
   b) Verify user exists & is ACTIVE
   c) bcrypt.compare(password, passwordHash)
   d) Generate JWT access token (15 min)
   e) Generate JWT refresh token (7 days)
   f) Create RefreshToken record in database
   g) Return tokens

4. Response sent to client
   - httpOnly cookie: accessToken
   - httpOnly cookie: refreshToken
   - JSON body: { success: true, user: {...} }

5. Client stores tokens
   - AccessToken: Used for API requests
   - RefreshToken: Used for token rotation


┌────────────────────────────────────────────────────────────┐
│                   AUTHENTICATED REQUEST                    │
└────────────────────────────────────────────────────────────┘

1. Client makes API request
   GET /api/doctor/appointments
   Headers: { Authorization: "Bearer <accessToken>" }
   OR Browser automatically sends cookie

2. API route calls JwtMiddleware.authenticate()
   a) Extract token from Authorization header or cookie
   b) Verify JWT signature (HMAC SHA-256)
   c) Check expiration (iat + expiresIn > now)
   d) Return AuthContext: { userId, email, role }

3. Route handler uses AuthContext
   - Validates user has required role
   - Checks resource ownership
   - Proceeds with business logic


┌────────────────────────────────────────────────────────────┐
│                  TOKEN REFRESH SEQUENCE                    │
└────────────────────────────────────────────────────────────┘

1. Client detects access token expired
   (JWT decode shows exp < now())

2. POST /api/auth/refresh
   Headers: { Authorization: "Bearer <refreshToken>" }
   OR Browser automatically sends refreshToken cookie

3. JwtAuthService.refreshToken() executes
   a) Verify refresh token signature
   b) Check expiration (still valid for 7 days)
   c) Check refresh token in database (not revoked)
   d) Load user from database
   e) Generate new access token
   f) Generate new refresh token (rotate)
   g) Update RefreshToken record
   h) Return new tokens

4. Response sent to client
   - New httpOnly cookie: accessToken
   - New httpOnly cookie: refreshToken

5. Client continues with fresh tokens


┌────────────────────────────────────────────────────────────┐
│                    LOGOUT SEQUENCE                         │
└────────────────────────────────────────────────────────────┘

1. User clicks Logout button
   POST /api/auth/logout

2. Source: getCurrentUser() → useAuth() → calls logout()

3. Route handler receives request
   a) Extract userId from token/context
   b) JwtAuthService.logout(userId)
   c) Delete all RefreshToken records for user
   d) Clear httpOnly cookies
   e) Return { success: true }

4. Client clears auth state
   - Remove AuthContext
   - Redirect to login page

5. User is logged out ✅
```

### 4.2 Silent Refresh (Transparent Token Rotation)

```typescript
// In lib/auth/server-auth.ts

export async function getCurrentUser(): Promise<AuthContext | null> {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('accessToken')?.value;

    // 1. Try to verify access token
    if (accessToken) {
      try {
        const user = await jwtMiddleware.authenticate(`Bearer ${accessToken}`);
        if (user) return user;  // ✅ Access token still valid
      } catch {
        // Access token expired, fall through to refresh
      }
    }

    // 2. Access token invalid/missing, try silent refresh
    const refreshToken = cookieStore.get('refreshToken')?.value;
    if (!refreshToken) {
      return null;  // ❌ No tokens, user must login
    }

    // 3. Exchange refresh token for new tokens
    const tokens = await authService.refreshToken(refreshToken);

    // 4. Verify new access token
    const user = await jwtMiddleware.authenticate(`Bearer ${tokens.accessToken}`);

    // 5. Update cookies (succeeds in Route Handlers, fails in Server Components)
    try {
      cookieStore.set('accessToken', tokens.accessToken, { ... });
      cookieStore.set('refreshToken', tokens.refreshToken, { ... });
    } catch {
      // Server Component context — read-only. Tokens will refresh on next request.
    }

    return user;  // ✅ Silently refreshed, user stays authenticated
  } catch {
    return null;  // ❌ Refresh failed, user must login
  }
}
```

---

## Implementation Details

### 5.1 Frontend Integration

#### AuthContext Provider
```typescript
// contexts/AuthContext.tsx
interface AuthContextType {
  user: StoredUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
}

export function AuthContextProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<StoredUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // On mount, verify user is still authenticated
    getCurrentUserFromServer().then(setUser).finally(() => setIsLoading(false));
  }, []);

  const login = async (email: string, password: string) => {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
      credentials: 'include',  // Include cookies
    });

    if (response.ok) {
      const data = await response.json();
      setUser(data.user);
    } else {
      throw new Error('Login failed');
    }
  };

  const logout = async () => {
    await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include',
    });
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
```

#### useAuth Hook
```typescript
// hooks/patient/useAuth.ts
export function useAuth(): UseAuthReturn {
  return useAuthContext();
}

// Usage in components
function Dashboard() {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) return <LoadingSpinner />;
  if (!isAuthenticated) return <Redirect to="/login" />;

  return (
    <div>
      <h1>Welcome, {user?.firstName} {user?.lastName}</h1>
    </div>
  );
}
```

### 5.2 Backend Integration

#### Route Handler with Authentication
```typescript
// app/api/doctor/appointments/route.ts
import { JwtMiddleware } from '@/lib/auth/middleware';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    // 1. Authenticate request
    const auth = await JwtMiddleware.authenticate(request, db);
    if (!auth.success || !auth.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Authorize role
    if (auth.user.role !== 'DOCTOR') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 3. Load data
    const appointments = await db.appointment.findMany({
      where: { doctor_id: auth.user.userId },
      include: { patient: true },
    });

    // 4. Return response
    return NextResponse.json({ appointments });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

#### Server Component with Authentication
```typescript
// app/doctor/dashboard/page.tsx
import { getCurrentUser } from '@/lib/auth/server-auth';
import { redirect } from 'next/navigation';

export default async function DoctorDashboard() {
  // 1. Get authenticated user (with silent refresh)
  const user = await getCurrentUser();

  // 2. Redirect if not authenticated
  if (!user) {
    redirect('/login');
  }

  // 3. Authorize role
  if (user.role !== 'DOCTOR') {
    redirect('/unauthorized');
  }

  // 4. Render dashboard
  return (
    <div>
      <h1>Doctor Dashboard</h1>
      <p>Welcome, {user.email}</p>
    </div>
  );
}
```

---

## Role-Based Access Control (RBAC)

### 6.1 Role Hierarchy

```typescript
// domain/enums/Role.ts
export enum Role {
  ADMIN = 'ADMIN',           // Full system access
  DOCTOR = 'DOCTOR',         // Medical decisions, consultations
  NURSE = 'NURSE',           // Clinical support, vitals, post-op
  FRONTDESK = 'FRONTDESK',   // Appointments, check-in
  PATIENT = 'PATIENT',       // Own data only
}

// User entity stores role
export class User {
  constructor(
    private readonly id: string,
    private readonly email: Email,
    private readonly role: Role,              // ← RBAC
    private readonly status: UserStatus,
    // ...
  ) {}

  getRole(): Role {
    return this.role;
  }
}
```

### 6.2 Authorization Checks

```typescript
// In route handlers
const auth = await JwtMiddleware.authenticate(request, db);
if (!auth.success || !auth.user) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

// Role check
if (auth.user.role !== 'DOCTOR') {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}

// Resource ownership check
const appointment = await db.appointment.findUnique({ where: { id } });
if (appointment.doctor_id !== auth.user.userId) {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}

// Proceed with business logic
return NextResponse.json({ appointment });
```

### 6.3 Access Control Matrix

```
┌──────────┬──────────┬─────────┬──────────────┬─────────┬──────────┐
│ Resource │ ADMIN    │ DOCTOR  │ NURSE        │ DESK    │ PATIENT  │
├──────────┼──────────┼─────────┼──────────────┼─────────┼──────────┤
│ Users    │ CRUD     │ Read    │ Read         │ Read    │ Own only │
│ Patients │ CRUD     │ Read    │ Read         │ CRUD    │ Own only │
│ Appts    │ CRUD     │ CRU(own)│ Read         │ CRUD    │ Own only │
│ Consult  │ CRUD     │ CRU(own)│ Read(assigned)│ CRU    │ Own only │
│ Medical  │ CRUD     │ CRU(own)│ CRU(assigned)│ -       │ Own only │
│ Audit    │ Read     │ -       │ -            │ -       │ -        │
│ Consents │ CRUD     │ CU(own) │ Read         │ CRU     │ Sign own │
└──────────┴──────────┴─────────┴──────────────┴─────────┴──────────┘

Legend: CRUD = Create, Read, Update, Delete
        R = Read only
        CRU = Create, Read, Update (no delete)
        - = No access
```

---

## Testing Strategy

### 7.1 Unit Tests

```typescript
// tests/unit/auth/JwtAuthService.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { JwtAuthService } from '@/infrastructure/auth/JwtAuthService';
import { Email } from '@/domain/value-objects/Email';
import { Role } from '@/domain/enums/Role';

describe('JwtAuthService', () => {
  let authService: JwtAuthService;
  let mockUserRepository: any;

  beforeEach(() => {
    mockUserRepository = {
      findByEmail: vi.fn(),
    };

    authService = new JwtAuthService(
      mockUserRepository,
      mockPrismaClient,
      testAuthConfig,
    );
  });

  describe('login()', () => {
    it('should return JWTToken on successful login', async () => {
      // Arrange
      const user = {
        getId: () => 'user-123',
        getEmail: () => new Email('user@example.com'),
        getPasswordHash: () => '$2b$10$...',
        canAuthenticate: () => true,
        getRole: () => Role.DOCTOR,
      };
      mockUserRepository.findByEmail.mockResolvedValue(user);

      // Act
      const tokens = await authService.login(
        new Email('user@example.com'),
        'password123'
      );

      // Assert
      expect(tokens.accessToken).toBeDefined();
      expect(tokens.refreshToken).toBeDefined();
      expect(tokens.expiresIn).toBe(15 * 60);
    });

    it('should throw DomainException on invalid password', async () => {
      // Arrange
      const user = {
        getId: () => 'user-123',
        getPasswordHash: () => '$2b$10$...wrong_hash',
        canAuthenticate: () => true,
      };
      mockUserRepository.findByEmail.mockResolvedValue(user);

      // Act & Assert
      await expect(
        authService.login(new Email('user@example.com'), 'wrongpassword')
      ).rejects.toThrow('Invalid email or password');
    });

    it('should throw DomainException if user not found', async () => {
      // Arrange
      mockUserRepository.findByEmail.mockResolvedValue(null);

      // Act & Assert
      await expect(
        authService.login(new Email('nonexistent@example.com'), 'password')
      ).rejects.toThrow('Invalid email or password');
    });
  });

  describe('verifyToken()', () => {
    it('should verify valid JWT token', async () => {
      // Arrange
      const validToken = authService.generateAccessToken(testUser);

      // Act
      const payload = await authService.verifyToken(validToken);

      // Assert
      expect(payload.userId).toBe(testUser.getId());
      expect(payload.email).toBe(testUser.getEmail().getValue());
    });

    it('should throw error for invalid token', async () => {
      // Act & Assert
      await expect(
        authService.verifyToken('invalid.token.here')
      ).rejects.toThrow();
    });

    it('should throw error for expired token', async () => {
      // Arrange
      const expiredToken = authService.generateAccessToken(testUser, {
        expiresIn: -100, // Already expired
      });

      // Act & Assert
      await expect(
        authService.verifyToken(expiredToken)
      ).rejects.toThrow('Token expired');
    });
  });
});
```

### 7.2 Integration Tests

```typescript
// tests/integration/auth/login-flow.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { db } from '@/lib/db';
import { JwtAuthService } from '@/infrastructure/auth/JwtAuthService';
import { Email } from '@/domain/value-objects/Email';
import * as bcrypt from 'bcrypt';

describe('Login Flow Integration', () => {
  let authService: JwtAuthService;
  let testUserId: string;

  beforeAll(async () => {
    // Setup
    authService = new JwtAuthService(
      new PrismaUserRepository(db),
      db,
      productionAuthConfig,
    );

    // Create test user
    const passwordHash = await bcrypt.hash('test-password', 10);
    const user = await db.user.create({
      data: {
        email: 'test@example.com',
        password_hash: passwordHash,
        first_name: 'Test',
        last_name: 'User',
        role: 'DOCTOR',
        status: 'ACTIVE',
      },
    });
    testUserId = user.id;
  });

  afterAll(async () => {
    // Cleanup
    await db.user.delete({ where: { id: testUserId } });
    await db.refreshToken.deleteMany({ where: { user_id: testUserId } });
  });

  it('should authenticate user and return valid tokens', async () => {
    // Act
    const tokens = await authService.login(
      new Email('test@example.com'),
      'test-password'
    );

    // Assert
    expect(tokens.accessToken).toBeTruthy();
    expect(tokens.refreshToken).toBeTruthy();

    // Verify token structure
    const parts = tokens.accessToken.split('.');
    expect(parts).toHaveLength(3); // JWT structure
  });

  it('should allow refresh with valid refresh token', async () => {
    // Arrange
    const { refreshToken } = await authService.login(
      new Email('test@example.com'),
      'test-password'
    );

    // Act
    const newTokens = await authService.refreshToken(refreshToken);

    // Assert
    expect(newTokens.accessToken).toBeTruthy();
    expect(newTokens.refreshToken).toBeTruthy();
    expect(newTokens.accessToken).not.toBe(refreshToken);
  });

  it('should revoke tokens on logout', async () => {
    // Arrange
    const { refreshToken } = await authService.login(
      new Email('test@example.com'),
      'test-password'
    );

    // Act
    await authService.logout(testUserId);

    // Assert
    const refreshTokenRecord = await db.refreshToken.findFirst({
      where: { user_id: testUserId },
    });
    expect(refreshTokenRecord).toBeNull();
  });
});
```

### 7.3 E2E Tests

```typescript
// tests/e2e/auth.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('should login successfully', async ({ page, context }) => {
    // Navigate to login page
    await page.goto('/login');

    // Fill login form
    await page.fill('input[name="email"]', 'doctor@example.com');
    await page.fill('input[name="password"]', 'password123');

    // Submit form
    await page.click('button[type="submit"]');

    // Wait for navigation
    await page.waitForURL('/doctor/dashboard');

    // Verify dashboard loaded
    await expect(page.locator('h1')).toContainText('Dashboard');

    // Verify cookies set
    const cookies = await context.cookies();
    const accessTokenCookie = cookies.find(c => c.name === 'accessToken');
    expect(accessTokenCookie).toBeTruthy();
    expect(accessTokenCookie?.httpOnly).toBe(true);
  });

  test('should logout successfully', async ({ page, context }) => {
    // Login first
    await loginAs(page, context, 'doctor@example.com', 'password123');

    // Click logout button
    await page.click('button[aria-label="Logout"]');

    // Verify redirected to login
    await page.waitForURL('/login');

    // Verify cookies cleared
    const cookies = await context.cookies();
    const accessTokenCookie = cookies.find(c => c.name === 'accessToken');
    expect(accessTokenCookie).toBeUndefined();
  });

  test('should redirect to login if not authenticated', async ({ page }) => {
    // Try to access protected route
    await page.goto('/doctor/dashboard');

    // Should redirect to login
    await page.waitForURL('/login');
  });
});
```

---

## Configuration Guide

### 8.1 Environment Variables

```bash
# .env.local (Development)
JWT_SECRET=dev-secret-change-in-production-min-32-chars
JWT_REFRESH_SECRET=dev-refresh-secret-change-in-production
NODE_ENV=development

# .env.production (Production)
JWT_SECRET=${RANDOM_32_CHAR_SECRET}  # Generate with: openssl rand -base64 32
JWT_REFRESH_SECRET=${RANDOM_32_CHAR_SECRET}
NODE_ENV=production
```

### 8.2 AuthConfig Interface

```typescript
export interface AuthConfig {
  // JWT Secrets
  jwtSecret: string;              // Min 32 characters
  jwtRefreshSecret: string;       // Different from jwtSecret

  // Token Expiration
  accessTokenExpiresIn?: number;  // Default: 15 * 60 (15 minutes)
  refreshTokenExpiresIn?: number; // Default: 7 * 24 * 60 * 60 (7 days)

  // Password Hashing
  saltRounds?: number;            // Default: 10 (higher = slower + more secure)
}
```

### 8.3 Token Expiration Recommendations

```typescript
// Different token lifetimes for different use cases

// Short-lived access token (recommended)
accessTokenExpiresIn: 15 * 60,  // 15 minutes
// Pros: Limits damage if token stolen
// Cons: More refresh requests

// Long-lived access token (less secure)
accessTokenExpiresIn: 24 * 60 * 60,  // 24 hours
// Pros: Fewer refresh requests
// Cons: Larger window if token stolen

// Refresh token (long-lived, stored in database)
refreshTokenExpiresIn: 7 * 24 * 60 * 60,  // 7 days
// Can be revoked from database
// Can be rotated on refresh
```

---

## Troubleshooting

### 9.1 Common Issues

#### Issue: "Invalid email or password" on correct credentials
```
Possible Causes:
1. Password hash not bcrypt format
2. User status is INACTIVE
3. User role requires additional setup (e.g., DOCTOR without doctor profile)
4. Email case sensitivity issue

Solution:
- Verify password hash starts with "$2b$"
- Check user.status in database
- For DOCTOR role, verify doctor profile exists
- Normalize email to lowercase
```

#### Issue: "Token expired" immediately after login
```
Possible Causes:
1. Server clock skew (server time ahead of client)
2. accessTokenExpiresIn set too low (0 or negative)
3. JWT library using wrong secret

Solution:
- Sync server time (NTP)
- Check authConfig.accessTokenExpiresIn > 0
- Verify JWT_SECRET matches token generation
- Check token creation time (iat field)
```

#### Issue: Middleware not authenticating requests
```
Possible Causes:
1. Authorization header missing or malformed
2. Cookies not being sent (missing credentials: 'include')
3. JWT_SECRET different between services
4. Refresh token revoked but access token expired

Solution:
- Check browser DevTools → Network → Headers
- Verify fetch({ credentials: 'include' })
- Ensure same JWT_SECRET across all services
- Manually set new tokens on token expiration
```

#### Issue: Refresh token not working
```
Possible Causes:
1. Refresh token record deleted from database
2. Refresh token expired (> 7 days old)
3. jwtRefreshSecret wrong or missing
4. User deleted after token issued

Solution:
- Check refresh_tokens table in database
- Verify expires_at > NOW()
- Confirm JWT_REFRESH_SECRET is set
- Ensure user still exists in database
```

### 9.2 Debug Logging

```typescript
// Add debug logging to lib/auth/middleware.ts
export class JwtMiddleware {
  async authenticate(authorizationHeader?: string) {
    console.log('[Auth Debug]', {
      headerPresent: !!authorizationHeader,
      headerLength: authorizationHeader?.length || 0,
      timestamp: new Date().toISOString(),
    });

    try {
      // ... authentication logic
    } catch (error) {
      console.error('[Auth Error]', {
        message: error.message,
        code: error.code,
        timestamp: new Date().toISOString(),
      });
      throw error;
    }
  }
}
```

---

## Migration from Third-Party Auth

### 11.1 From Clerk to JWT

**Step 1: Backup existing user data**
```sql
SELECT id, email, first_name, last_name, role, status
FROM clerk_users
WHERE organization_id = 'your-org';
```

**Step 2: Create users in HIMS with hashed passwords**
```typescript
// migration.ts
const users = await clerkClient.users.getUserList();

for (const clerkUser of users) {
  const passwordHash = await bcrypt.hash('temp-password', 10);
  
  await db.user.create({
    data: {
      email: clerkUser.emailAddresses[0].emailAddress,
      password_hash: passwordHash,
      first_name: clerkUser.firstName || '',
      last_name: clerkUser.lastName || '',
      role: clerkUser.publicMetadata.role || 'PATIENT',
      status: 'ACTIVE',
    },
  });
}

await sendPasswordResetEmails(users);
```

**Step 3: Update authentication middleware**
- Remove `@clerk/nextjs` from package.json
- Update middleware.ts to use JwtMiddleware
- Update all components to use useAuth() from contexts/AuthContext

**Step 4: Send password reset emails**
- Users received temporary password
- User resets password on first login
- JWT authentication begins

---

## Best Practices

✅ **DO:**
- ✅ Store JWT_SECRET in environment variables (never in code)
- ✅ Use httpOnly cookies for token storage
- ✅ Implement token refresh before expiration
- ✅ Log authentication failures for audit trails
- ✅ Validate email format (value object)
- ✅ Use bcrypt with salt rounds >= 10
- ✅ Rotate refresh tokens on use
- ✅ Implement CSRF tokens for state-changing operations
- ✅ Check user status & roles on authentication
- ✅ Implement rate limiting on login endpoint

❌ **DON'T:**
- ❌ Store JWT_SECRET in code or .env.local
- ❌ Store tokens in localStorage (XSS vulnerable)
- ❌ Use short password hashing (bcrypt saltRounds < 10)
- ❌ Skip email validation
- ❌ Trust client-side role checking
- ❌ Store plain text passwords
- ❌ Use access tokens for long-lived sessions
- ❌ Skip token signature verification
- ❌ Ignore token expiration
- ❌ Send tokens in query parameters (URL logging)

---

## Appendix: Key Files

| File | Purpose | Location |
|------|---------|----------|
| JwtAuthService | Core auth logic | infrastructure/auth/JwtAuthService.ts |
| JwtMiddleware | Token verification | lib/auth/middleware.ts |
| getCurrentUser | Server-side auth | lib/auth/server-auth.ts |
| useAuth hook | Frontend auth state | hooks/patient/useAuth.ts |
| AuthContext | Global auth provider | contexts/AuthContext.tsx |
| IAuthService | Interface (domain) | domain/interfaces/services/IAuthService.ts |
| User entity | Domain model | domain/entities/User.ts |
| PrismaUserRepository | Data access | infrastructure/repositories/PrismaUserRepository.ts |

---

**Document Status:** ✅ Production Ready  
**Last Updated:** March 2, 2026  
**Maintained By:** Security Architecture Team

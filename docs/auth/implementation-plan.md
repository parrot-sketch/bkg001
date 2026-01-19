# Authentication System - Implementation Plan

## Critical Fixes Status

### ✅ Completed
1. **Gap Analysis Document** - Comprehensive security audit (`docs/auth/auth-gaps.md`)
2. **Password Validation Value Object** - Strong password rules (`domain/value-objects/Password.ts`)
3. **Public Registration DTO** - Separate DTO for public signup (`application/dtos/PublicRegisterUserDto.ts`)

### 🔄 In Progress / Next Steps

#### Phase 1: Critical Security Fixes

**1. Create Public Registration Use Case**
- File: `application/use-cases/RegisterPublicUserUseCase.ts`
- Features:
  - Uses PublicRegisterUserDto (no id, no role)
  - Generates UUID server-side
  - Enforces PATIENT role
  - Uses Password value object for validation
  - Generic error messages (no user enumeration)
  - Password strength validation

**2. Modify AuthController**
- File: `controllers/AuthController.ts`
- Changes:
  - Add `registerPublic()` method (unauthenticated)
  - Keep existing `register()` for admin use
  - Both methods call appropriate use cases

**3. Update RegisterUserUseCase**
- File: `application/use-cases/RegisterUserUseCase.ts`
- Changes:
  - Fix error message to be generic
  - Keep for admin-created users (allows any role)

**4. Prisma Schema**
- File: `prisma/schema.prisma`
- Status: ✅ Already correct
  - User.id has `@default(uuid())` - server generates
  - User.role is required but validated in use case
  - Patient.user_id is optional (correct lifecycle)

#### Phase 2: Testing

**5. Unit Tests**
- Directory: `__tests__/auth/`
- Files to create:
  - `RegisterPublicUserUseCase.test.ts`
  - `Password.test.ts`
  - `AuthController.registerPublic.test.ts`
- Coverage:
  - Password validation (weak, strong, common passwords)
  - Role enforcement (only PATIENT)
  - UUID generation (server-side)
  - Generic error messages
  - Duplicate email handling
  - Password hashing verification

#### Phase 3: Integration

**6. Update Frontend**
- File: `app/(auth)/patient/register/page.tsx`
- Changes:
  - Remove `id` from registration request
  - Remove `role` from registration request
  - Use PublicRegisterUserDto

**7. Update API Client**
- File: `lib/api/auth.ts`
- Changes:
  - Add `registerPublic()` method
  - Use PublicRegisterUserDto

---

## Implementation Notes

### Error Message Strategy

**Public Registration:**
```typescript
// ❌ BAD - reveals email existence
throw new DomainException('User with this email already exists');

// ✅ GOOD - generic message
throw new DomainException('Unable to complete registration. Please try again.');
```

**Internal Logging:**
- Log actual reason internally for debugging
- Never expose in public-facing errors

### Role Validation Strategy

```typescript
// Public signup - always PATIENT
const role = Role.PATIENT; // Hard-coded, not from client

// Admin signup - from DTO, but validated
if (dto.role !== Role.PATIENT && !isAdmin(req.auth)) {
  throw new DomainException('Invalid role for public registration');
}
```

### UUID Generation

```typescript
// Option 1: Prisma default (preferred)
id: String @id @default(uuid()) // Prisma generates

// Option 2: Server-side generation
import { randomUUID } from 'crypto';
const userId = randomUUID();
```

### Password Validation Flow

```typescript
// 1. Validate with Password value object
const password = Password.create(dto.password, requireSpecialChar: false);

// 2. Hash via AuthService (also validates minimum length)
const hash = await authService.hashPassword(password.getValue());

// 3. Create User entity
const user = User.create({ passwordHash: hash, ... });
```

---

## Testing Strategy

### Unit Tests

**Password Validation:**
```typescript
describe('Password.create()', () => {
  it('should reject passwords less than 8 characters');
  it('should reject passwords without uppercase');
  it('should reject passwords without lowercase');
  it('should reject passwords without numbers');
  it('should reject common weak passwords');
  it('should accept valid strong passwords');
});
```

**Public Registration:**
```typescript
describe('RegisterPublicUserUseCase', () => {
  it('should create user with PATIENT role');
  it('should generate UUID server-side');
  it('should reject duplicate emails (generic error)');
  it('should reject weak passwords');
  it('should hash password correctly');
  it('should return response without password');
});
```

### Integration Tests

- Test registration endpoint (public)
- Test error responses (generic messages)
- Test role enforcement
- Test UUID generation

---

## Migration Notes

### Breaking Changes

**Public Registration DTO:**
- Remove `id` field (breaking)
- Remove `role` field (breaking)
- Frontend must update registration requests

**Error Messages:**
- Change from specific to generic
- Clients must handle generic errors
- Internal logging for debugging

### Backward Compatibility

- Keep `RegisterUserDto` for admin use (internal)
- Keep existing `register()` method for admin
- Add new `registerPublic()` for public signup

---

## Next Steps

1. ✅ Gap analysis complete
2. ✅ Password validation value object created
3. ✅ Public registration DTO created
4. ⏳ Create RegisterPublicUserUseCase
5. ⏳ Modify AuthController
6. ⏳ Fix RegisterUserUseCase error messages
7. ⏳ Add comprehensive tests
8. ⏳ Update frontend registration

---

**Status:** Phase 1 - Critical fixes in progress  
**Priority:** Production-critical  
**Estimated Time:** 4-6 hours for complete implementation + tests

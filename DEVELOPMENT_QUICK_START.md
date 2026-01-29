# Quick Development Setup Guide

## Initial Setup

### 1. Clone and Install Dependencies
```bash
git clone <repo>
cd fullstack-healthcare
npm install
```

### 2. Set Up Environment
```bash
cp .env.example .env.local
# Edit .env.local with your database URL and other secrets
```

### 3. Set Up Database
```bash
# Run migrations
npm run db:migrate

# Seed with test data
npm run db:seed
```

### 4. Start Development Server
```bash
npm run dev
```

Open http://localhost:3000/login

## Test Credentials

### Admin
```
Email: admin@nairobisculpt.com
Password: admin123
```

### Doctor (Surgeon)
```
Email: mukami.gathariki@nairobisculpt.com
Password: doctor123
```

### Nurse
```
Email: jane.wambui@nairobisculpt.com
Password: nurse123
```

### Frontdesk Staff
```
Email: david.omondi@nairobisculpt.com
Password: frontdesk123
```

### Patient
```
Email: test001@patient.nairobisculpt.com
Password: patient123
```

## Database Commands

```bash
# View database in Prisma Studio
npm run db:studio

# Run migrations
npm run db:migrate

# Generate new migration
npm run db:migrate -- --name migration_name

# Seed database (clears existing data)
npm run db:seed

# Seed without clearing (additive)
SKIP_CLEAR=true npm run db:seed

# Diagnose authentication issues
npx ts-node scripts/diagnose-login.ts
```

## Troubleshooting

### Login Returns 401 Error
**Solution:** Database is not seeded. Run:
```bash
npm run db:seed
```

### Doctor Can't Log In
**Check:**
1. User status is ACTIVE (not INACTIVE)
2. Doctor has onboarding_status = ACTIVE
3. Doctor profile exists in database

Run diagnostic:
```bash
npx ts-node scripts/diagnose-login.ts
```

### Database Connection Errors
**Check:**
1. DATABASE_URL is set correctly in .env.local
2. PostgreSQL server is running
3. Database exists and is accessible

## Development Workflow

### Phase 3 Completion (Latest)
- ✅ Fixed `canStartConsultation()` bug (was allowing PENDING status)
- ✅ Created 6 use cases (Reject, GetPending, GetSchedule, CheckDoubleBooking, Schedule, Confirm)
- ✅ Created 4 DTOs (Reject, GetPending, GetSchedule, CheckDoubleBooking)
- ✅ Integrated Phase 1 temporal fields in application layer
- ✅ Integrated Phase 2 domain services in application layer

### Next: Phase 4 Infrastructure Layer
- Implement repository methods with temporal fields
- Add domain event publishing
- Add transaction support
- Implement advanced query patterns

## Key Files

### Authentication
- `app/api/auth/login/route.ts` - Login endpoint
- `application/use-cases/LoginUseCase.ts` - Login business logic
- `infrastructure/auth/JwtAuthService.ts` - JWT implementation
- `scripts/diagnose-login.ts` - Diagnostic tool

### Appointments (Phase 3)
- `application/use-cases/ScheduleAppointmentUseCase.ts` - Create appointments
- `application/use-cases/ConfirmAppointmentUseCase.ts` - Confirm appointments
- `application/use-cases/RejectAppointmentUseCase.ts` - Reject appointments
- `application/use-cases/GetPendingAppointmentsUseCase.ts` - Query pending
- `application/use-cases/GetDoctorScheduleUseCase.ts` - Query schedule
- `application/use-cases/CheckDoubleBookingUseCase.ts` - Validate availability

### Database
- `prisma/schema.prisma` - Database schema
- `prisma/seed.ts` - Seed script
- `migrations/` - Database migrations

## Code Structure

```
/
├── app/                          # Next.js app directory
│   └── api/auth/                 # Authentication endpoints
├── application/                  # Application layer (use cases, DTOs)
├── domain/                       # Domain layer (entities, value objects, services)
├── infrastructure/               # Infrastructure layer (database, auth)
├── prisma/                       # Database configuration
│   ├── schema.prisma             # Database schema
│   ├── seed.ts                   # Database seed script
│   └── migrations/               # Database migrations
├── scripts/                      # Utility scripts
├── tests/                        # Test files
└── lib/                          # Shared utilities
```

## Testing

### Run Tests
```bash
npm run test
```

### Run Specific Test
```bash
npm run test -- path/to/test.ts
```

### Watch Mode
```bash
npm run test:watch
```

## Common Issues & Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| 401 Login Error | No seeded users | `npm run db:seed` |
| Doctor can't login | Onboarding not ACTIVE | Check doctor profile status in DB |
| Appointment conflicts | Duplicate doctor/date/time | Use CheckDoubleBookingUseCase before creating |
| Password hash mismatch | Database corrupted | Re-seed with `npm run db:seed` |

## Performance Notes

### Phase 1 Indexes (Installed)
- `(doctor_id, scheduled_at)` - Fast appointment queries
- `(status, scheduled_at)` - Fast status filtering
- `(patient_id, scheduled_at)` - Fast patient appointment lookup
- `(status_changed_at)` - Fast temporal queries

### Query Optimization
- Use `GetPendingAppointmentsUseCase` for filtered queries (uses indexes)
- Use `GetDoctorScheduleUseCase` for schedule analytics
- Always check availability with `CheckDoubleBookingUseCase` before scheduling

## Documentation

- [PHASE_3_COMPLETION_SUMMARY.md](PHASE_3_COMPLETION_SUMMARY.md) - Phase 3 deliverables
- [LOGIN_ISSUE_RESOLUTION.md](LOGIN_ISSUE_RESOLUTION.md) - Login troubleshooting
- [docs/architecture/](docs/architecture/) - Architecture documentation

## Support

For issues not covered here:
1. Check [LOGIN_ISSUE_RESOLUTION.md](LOGIN_ISSUE_RESOLUTION.md)
2. Run diagnostic: `npx ts-node scripts/diagnose-login.ts`
3. Check database: `npm run db:studio`
4. Review logs in terminal where `npm run dev` is running

---

**Last Updated:** January 25, 2026  
**Phase:** 3 (Application Layer) - Complete ✅  
**Database Status:** Seeded and verified ✅

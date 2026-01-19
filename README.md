# Health Information Management System (HIMS)

A comprehensive healthcare management system built with Next.js, Prisma, and PostgreSQL, implementing Clean Architecture principles for maintainable and scalable healthcare software.

## Quick Start

```bash
# Install dependencies
npm install

# Set up environment variables (see .env.example)
cp .env.example .env.local

# Set up database
npx prisma generate
npx prisma migrate dev

# Start development server
npm run dev
```

The application will be available at [http://localhost:3000](http://localhost:3000).

## Features

- **Patient Management:** Complete patient registration and record management
- **Appointment Scheduling:** Doctor appointment booking and management
- **Clinical Documentation:** Vital signs, diagnoses, and medical records
- **Billing System:** Payment processing and bill generation
- **Role-Based Access:** Multi-role support (Admin, Doctor, Nurse, Lab Technician, Patient, Cashier)
- **Secure Authentication:** Clerk-based authentication and authorization

## Tech Stack

- **Frontend:** Next.js 15.1.0, React 19, TypeScript
- **Backend:** Next.js Server Actions, Prisma ORM
- **Database:** PostgreSQL
- **Authentication:** Clerk
- **UI:** TailwindCSS, Radix UI, Recharts
- **Testing:** Vitest
- **Validation:** Zod

## Project Status

⚠️ **Active Refactoring:** This system is currently undergoing a Clean Architecture refactor. The domain layer has been established. See [Architecture Documentation](./docs/architecture/layering.md) for details.

## Documentation

Comprehensive documentation is available in the `/docs` directory:

- **[Architecture](./docs/architecture/)** - System architecture and design
  - [System Overview](./docs/architecture/system-overview.md) - Complete architectural audit
  - [Layering](./docs/architecture/layering.md) - Clean Architecture refactoring plan
  - [Domain Model](./docs/architecture/domain-model.md) - Domain entity relationships

- **[Decisions](./docs/decisions/)** - Architecture Decision Records (ADRs)
  - [ADR-001: Domain Layer First](./docs/decisions/adr-001-domain-layer.md)
  - [ADR-002: Testing Strategy](./docs/decisions/adr-002-testing-strategy.md)

- **[Setup](./docs/setup/)** - Development and testing guides
  - [Local Development](./docs/setup/local-development.md)
  - [Testing Guide](./docs/setup/testing.md)

- **[Product](./docs/product/)** - Product documentation
  - [Workflows](./docs/product/workflows.md) - Healthcare workflows
  - [Roles](./docs/product/roles.md) - User roles and permissions

## Development

### Prerequisites

- Node.js 18+
- PostgreSQL 14+
- Clerk account (for authentication)

### Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm test             # Run tests
npm run test:watch   # Run tests in watch mode
npm run test:coverage # Run tests with coverage
npm run lint         # Lint code
```

### Database Management

```bash
npx prisma generate      # Generate Prisma Client
npx prisma migrate dev   # Create and apply migrations
npx prisma studio        # Open Prisma Studio GUI
npx prisma migrate reset # Reset database (⚠️ deletes data)
```

## Architecture

This project follows Clean Architecture principles:

```
domain/          - Pure business logic (no dependencies)
application/     - Use cases and orchestration (in progress)
infrastructure/  - Database, auth, external services (in progress)
interfaces/      - UI, API routes, Server Actions (in progress)
```

See [Architecture Documentation](./docs/architecture/) for detailed information.

## Contributing

1. Review the [Architecture Documentation](./docs/architecture/layering.md)
2. Follow Clean Architecture principles
3. Write tests for new domain logic
4. Update documentation as needed

## License

[Add license information]

## Support

For questions or issues, please refer to the documentation or open an issue in the repository.

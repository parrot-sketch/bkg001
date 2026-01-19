# Local Development Setup

**Last Updated:** January 2025

## Prerequisites

- Node.js 18+ (recommended: 20+)
- PostgreSQL 14+ (local or remote)
- npm or yarn package manager
- Git

## Initial Setup

### 1. Clone Repository

```bash
git clone <repository-url>
cd fullstack-healthcare
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Variables

Create a `.env.local` file in the root directory:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/hims_db"

# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
CLERK_SECRET_KEY=your_clerk_secret_key
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/
```

### 4. Database Setup

```bash
# Generate Prisma Client
npx prisma generate

# Run migrations
npx prisma migrate dev

# (Optional) Seed database
npm run seed
```

### 5. Start Development Server

```bash
npm run dev
```

The application will be available at [http://localhost:3000](http://localhost:3000)

## Project Structure

```
/home/bkg/fullstack-healthcare/
├── app/                    # Next.js App Router pages
├── components/             # React components
├── domain/                 # Domain layer (business logic)
├── lib/                    # Shared utilities
├── prisma/                 # Database schema and migrations
├── tests/                  # Test files
├── types/                  # TypeScript type definitions
└── utils/                  # Utility functions and services
```

## Development Workflow

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### Database Management

```bash
# Create a new migration
npx prisma migrate dev --name migration_name

# View database in Prisma Studio
npx prisma studio

# Reset database (⚠️ deletes all data)
npx prisma migrate reset
```

### Code Quality

```bash
# Lint code
npm run lint

# Type check
npm run build
```

## Troubleshooting

### Database Connection Issues

- Verify PostgreSQL is running
- Check `DATABASE_URL` in `.env.local`
- Ensure database exists: `createdb hims_db`

### Prisma Client Issues

```bash
# Regenerate Prisma Client
npx prisma generate

# Reset Prisma Client cache
rm -rf node_modules/.prisma
npx prisma generate
```

### Port Already in Use

If port 3000 is in use, specify a different port:

```bash
npm run dev -- -p 3001
```

## IDE Setup

### VS Code Extensions (Recommended)

- Prisma
- ESLint
- Prettier
- TypeScript and JavaScript Language Features

### TypeScript Path Aliases

The project uses path aliases defined in `tsconfig.json`:

- `@domain/*` → `./domain/*`
- `@application/*` → `./application/*` (future)
- `@infrastructure/*` → `./infrastructure/*` (future)

## Next Steps

- Read [Testing Guide](./testing.md) for testing setup
- Review [Architecture Documentation](../architecture/system-overview.md)
- Check [Clean Architecture Refactoring Plan](../architecture/layering.md)

# CI/CD Integration Guide

## GitHub Actions Example

```yaml
name: E2E Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  e2e-tests:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_USER: postgres
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: nairobi_sculpt
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5433:5432

    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci --legacy-peer-deps
      
      - name: Install Playwright browsers
        run: npx playwright install --with-deps chromium
      
      - name: Setup environment
        run: |
          echo "DATABASE_URL=postgresql://postgres:postgres@localhost:5433/nairobi_sculpt" >> .env
          echo "NEXT_PUBLIC_API_URL=http://localhost:3000/api" >> .env
      
      - name: Generate Prisma Client
        run: npm run db:generate
      
      - name: Run database migrations
        run: npm run db:migrate
      
      - name: Seed database
        run: npm run db:seed
      
      - name: Build application
        run: npm run build
      
      - name: Start application
        run: npm start &
        env:
          PORT: 3000
      
      - name: Wait for server
        run: npx wait-on http://localhost:3000
      
      - name: Run E2E tests
        run: npm run test:e2e
        env:
          PLAYWRIGHT_BASE_URL: http://localhost:3000
      
      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: tests/e2e/reports/html/
          retention-days: 30
      
      - name: Upload screenshots
        if: failure()
        uses: actions/upload-artifact@v3
        with:
          name: test-screenshots
          path: tests/e2e/screenshots/
          retention-days: 7
```

## Running Tests in CI

```bash
# Install dependencies
npm ci --legacy-peer-deps

# Install Playwright
npx playwright install --with-deps chromium

# Setup database
npm run db:migrate
npm run db:seed

# Build application
npm run build

# Start server (background)
npm start &

# Run tests
npm run test:e2e
```

## Test Reports

After tests run, view reports:

```bash
# HTML Report
npm run test:e2e:report

# Or open directly
open tests/e2e/reports/html/index.html
```

## Environment Variables

Required for CI/CD:

```env
DATABASE_URL=postgresql://user:pass@host:port/db
NEXT_PUBLIC_API_URL=http://localhost:3000/api
PLAYWRIGHT_BASE_URL=http://localhost:3000
```

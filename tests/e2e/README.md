# End-to-End Testing with Playwright

Comprehensive E2E test suite for the Nairobi Sculpt Surgical Center application. Tests cover all five dashboards (Patient, Doctor, Frontdesk, Nurse, Admin) with full workflow validation, UI/UX checks, and data integrity verification.

## Prerequisites

- Node.js 18+ installed
- Database seeded with test data (`npm run db:seed`)
- Development server can run on `http://localhost:3000`

## Installation

```bash
# Install Playwright browsers (run once after npm install)
npx playwright install --with-deps chromium

# Or install all browsers
npx playwright install --with-deps
```

## Running Tests

### Run All E2E Tests

```bash
npm run test:e2e
```

### Run Specific Dashboard Tests

```bash
# Patient Dashboard
npx playwright test tests/e2e/dashboards/patient-dashboard.spec.ts

# Doctor Dashboard
npx playwright test tests/e2e/dashboards/doctor-dashboard.spec.ts

# Frontdesk Dashboard
npx playwright test tests/e2e/dashboards/frontdesk-dashboard.spec.ts

# Nurse Dashboard
npx playwright test tests/e2e/dashboards/nurse-dashboard.spec.ts

# Admin Dashboard
npx playwright test tests/e2e/dashboards/admin-dashboard.spec.ts
```

### Run Tests in Different Browsers

```bash
# Chromium only (faster for development)
npx playwright test --project=chromium

# All browsers (Chrome, Firefox, Safari)
npx playwright test

# Mobile browsers
npx playwright test --project="Mobile Chrome"
npx playwright test --project="Mobile Safari"
```

### Run Tests in UI Mode (Interactive)

```bash
npx playwright test --ui
```

### Run Tests in Debug Mode

```bash
npx playwright test --debug
```

### Run Tests in Headed Mode (See Browser)

```bash
npx playwright test --headed
```

## Test Structure

```
tests/e2e/
├── fixtures/           # Test fixtures and authentication helpers
│   └── auth.fixture.ts # Login/logout utilities for all roles
├── helpers/            # Reusable test helper functions
│   └── test-helpers.ts # UI interaction, assertions, data generation
├── dashboards/         # Dashboard-specific test suites
│   ├── patient-dashboard.spec.ts
│   ├── doctor-dashboard.spec.ts
│   ├── frontdesk-dashboard.spec.ts
│   ├── nurse-dashboard.spec.ts
│   └── admin-dashboard.spec.ts
├── integration/        # Cross-dashboard integration tests
│   └── workflow-integration.spec.ts
└── reports/            # Test reports (generated)
    ├── html/           # HTML test reports
    └── results.json    # JSON test results
```

## Authentication & RBAC Test Coverage

### JWT Authentication (`tests/e2e/auth/jwt-authentication.spec.ts`)
- ✅ Login flow for all roles (Admin, Doctor, Nurse, Frontdesk, Patient)
- ✅ JWT token issuance and storage
- ✅ User context updates after login
- ✅ Role-specific dashboard redirects
- ✅ Invalid credentials handling
- ✅ Token validation

### RBAC & Route Protection (`tests/e2e/auth/rbac-route-protection.spec.ts`)
- ✅ Admin route protection (`/admin/**`)
- ✅ Doctor route protection (`/doctor/**`)
- ✅ Patient route access (multiple roles allowed)
- ✅ Unauthenticated access handling
- ✅ Client-side route protection
- ✅ Role-based redirects

### Session Management (`tests/e2e/auth/session-management.spec.ts`)
- ✅ Token refresh mechanism
- ✅ API retry after refresh
- ✅ Logout and token cleanup
- ✅ Session persistence across reloads
- ✅ Multi-tab session sharing

### API Protection (`tests/e2e/auth/api-protection.spec.ts`)
- ✅ JWT authentication on API endpoints
- ✅ Authorization header inclusion
- ✅ 401 handling for expired/invalid tokens
- ✅ RBAC enforcement on API endpoints
- ✅ Invalid token rejection

### Error Handling (`tests/e2e/auth/error-handling.spec.ts`)
- ✅ Expired JWT handling
- ✅ Invalid token signatures
- ✅ Network failures
- ✅ Error message display
- ✅ Security edge cases (XSS, info leakage)

### Dashboard Integration (`tests/e2e/auth/dashboard-integration.spec.ts`)
- ✅ Patient dashboard with JWT auth
- ✅ Doctor dashboard with JWT auth
- ✅ Admin dashboard with JWT auth
- ✅ Nurse dashboard with JWT auth
- ✅ Frontdesk dashboard with JWT auth
- ✅ Role-based component rendering
- ✅ Profile information accuracy

## Dashboard Test Coverage

### Patient Dashboard
- ✅ Authentication (login/logout)
- ✅ Navigation between sections
- ✅ Dashboard overview and stats
- ✅ Schedule appointment with doctor selection
- ✅ View doctor profiles
- ✅ View appointment history
- ✅ UI/UX validation (branding, responsive)
- ✅ Error handling and empty states

### Doctor Dashboard
- ✅ Authentication and protected routes
- ✅ View appointments and schedule
- ✅ Check-in patients
- ✅ Start and complete consultations
- ✅ View patient information
- ✅ Doctor profile viewing

### Frontdesk Dashboard
- ✅ View today's appointments
- ✅ Check-in patients
- ✅ Search and register patients
- ✅ Filter appointments by date/status
- ✅ View appointment details with doctor info

### Nurse Dashboard
- ✅ View assigned patients
- ✅ Record vital signs
- ✅ Add pre/post-op care notes
- ✅ View patient appointments and assigned doctors
- ✅ Access doctor profiles

### Admin Dashboard
- ✅ Staff management (create/update/deactivate)
- ✅ Patient approval workflow
- ✅ Appointments overview and filtering
- ✅ Reports and analytics
- ✅ Pre/post-op workflow monitoring

## Test Scenarios Covered

### Authentication
- Login with valid credentials for each role
- Logout functionality
- Token validation and protected route access
- Unauthorized access attempts

### Navigation
- Sidebar navigation between sections
- Active route highlighting
- Mobile responsive navigation

### Core Workflows
- **Patient**: Register → Login → Schedule Appointment → View Appointments → View Doctor Profile
- **Doctor**: View Appointments → Check-in Patient → Start Consultation → Complete Consultation
- **Frontdesk**: View Appointments → Check-in Patient → Search/Register Patient
- **Nurse**: View Assigned Patients → Record Vitals → Add Care Notes
- **Admin**: Approve Patient → Create Staff → View Reports → Monitor Workflows

### Data Integrity
- Doctor information matches database (name, title, clinic, bio)
- Appointment statuses update correctly
- Pre/post-op workflows maintain data consistency

### UI/UX Validation
- Nairobi Sculpt branding (Deep Navy #1a1a2e, Gold #d4af37)
- Typography (Inter + Playfair Display)
- Loading states display correctly
- Error states with toast notifications
- Modal dialogs open/close properly

### Accessibility
- Keyboard navigation
- ARIA labels on interactive elements
- Screen reader compatibility checks

### Edge Cases
- Double booking prevention
- Unauthorized access attempts
- Empty states (no appointments, no patients)
- API failure handling

## Test Data

Tests use seeded database data. Ensure database is seeded before running tests:

```bash
npm run db:seed
```

### Test User Credentials

Test users are defined in `tests/e2e/fixtures/auth.fixture.ts`. These should match seeded data in `prisma/seed.ts`:

- **Patient**: `patient.test@nairobisculpt.com`
- **Doctor**: `ken.aluora@nairobisculpt.com`
- **Frontdesk**: `frontdesk.test@nairobisculpt.com`
- **Nurse**: `nurse.test@nairobisculpt.com`
- **Admin**: `admin.test@nairobisculpt.com`

## Configuration

### Environment Variables

Create `.env.test` file (optional, for test-specific config):

```env
PLAYWRIGHT_BASE_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:3000/api
```

### Playwright Configuration

See `playwright.config.ts` for:
- Test directories
- Browser configurations
- Reporter settings
- Timeout configurations
- Screenshot/video on failure

## Viewing Test Reports

After running tests, view HTML report:

```bash
npx playwright show-report
```

Or open directly:
```
tests/e2e/reports/html/index.html
```

## CI/CD Integration

Tests are ready for CI/CD pipelines. Add to your pipeline:

```yaml
# Example GitHub Actions
- name: Install dependencies
  run: npm ci

- name: Install Playwright browsers
  run: npx playwright install --with-deps chromium

- name: Run E2E tests
  run: npm run test:e2e

- name: Upload test results
  if: always()
  uses: actions/upload-artifact@v3
  with:
    name: playwright-report
    path: tests/e2e/reports/html/
```

## Troubleshooting

### Tests Fail with "Browser not found"

```bash
npx playwright install --with-deps
```

### Tests Fail with "Navigation timeout"

- Ensure dev server is running on `http://localhost:3000`
- Check if database is accessible and seeded
- Increase timeout in `playwright.config.ts` if needed

### Tests Fail with "Element not visible"

- Check if UI selectors changed
- Use Playwright Inspector: `npx playwright test --debug`
- Check screenshots in `tests/e2e/screenshots/`

### Authentication Fails

- Verify test user credentials exist in database
- Check if login flow has changed
- Ensure JWT tokens are being stored correctly

## Best Practices

1. **Isolation**: Each test should be independent and not rely on other tests
2. **Cleanup**: Tests clean up after themselves (logout, clear state)
3. **Deterministic**: Tests use specific test data, not random data
4. **Readable**: Use descriptive test names and helper functions
5. **Maintainable**: Reuse helpers and fixtures across tests

## Performance Testing (Optional)

For load testing, consider using Playwright's `browserContext.route()` to measure performance:

```typescript
await page.route('**/*', (route) => {
  const startTime = Date.now();
  route.continue();
  // Measure response time
});
```

Or use tools like:
- k6 for API load testing
- Lighthouse CI for performance metrics
- Web Vitals measurement

## Contributing

When adding new tests:

1. Use existing fixtures and helpers
2. Follow naming conventions (`*.spec.ts`)
3. Group related tests with `test.describe()`
4. Add meaningful test descriptions
5. Update this README if adding new test categories

## Support

For issues or questions:
1. Check test reports for error details
2. Review screenshots for visual debugging
3. Check browser console logs in headed mode
4. Verify database state matches expected test data

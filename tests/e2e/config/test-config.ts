/**
 * E2E Test Configuration
 * 
 * Centralized test configuration for E2E tests.
 * Includes API endpoints, timeouts, test data, and environment settings.
 */

export const TEST_CONFIG = {
  // API Configuration
  API_BASE_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api',
  BASE_URL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',

  // Timeouts (in milliseconds)
  TIMEOUTS: {
    NAVIGATION: 30000,
    API_RESPONSE: 10000,
    ELEMENT_VISIBLE: 5000,
    TOAST_NOTIFICATION: 5000,
    TOKEN_REFRESH: 15000,
  },

  // Test User Credentials (should match seeded data)
  TEST_USERS: {
    ADMIN: {
      email: 'admin.test@nairobisculpt.com',
      password: 'AdminPassword123!',
      role: 'ADMIN',
    },
    DOCTOR: {
      email: 'ken.aluora@nairobisculpt.com',
      password: 'DoctorPassword123!',
      role: 'DOCTOR',
    },
    NURSE: {
      email: 'nurse.test@nairobisculpt.com',
      password: 'NursePassword123!',
      role: 'NURSE',
    },
    FRONTDESK: {
      email: 'frontdesk.test@nairobisculpt.com',
      password: 'FrontdeskPassword123!',
      role: 'FRONTDESK',
    },
    PATIENT: {
      email: 'patient.test@nairobisculpt.com',
      password: 'TestPassword123!',
      role: 'PATIENT',
    },
  },

  // Route Access Rules (should match lib/routes.ts)
  ROUTE_ACCESS: {
    '/admin/**': ['admin'],
    '/patient/**': ['patient', 'admin', 'doctor', 'nurse'],
    '/doctor/**': ['doctor'],
    '/nurse/**': ['nurse'],
    '/frontdesk/**': ['frontdesk'],
  },

  // Expected Redirect Paths
  ROLE_DASHBOARDS: {
    ADMIN: '/admin/dashboard',
    DOCTOR: '/doctor/dashboard',
    NURSE: '/nurse/dashboard',
    FRONTDESK: '/frontdesk/dashboard',
    PATIENT: '/patient/dashboard',
  },

  // API Endpoints
  API_ENDPOINTS: {
    AUTH: {
      LOGIN: '/api/auth/login',
      LOGOUT: '/api/auth/logout',
      REGISTER: '/api/auth/register',
      REFRESH: '/api/auth/refresh',
    },
    PATIENT: {
      PROFILE: '/api/patient/profile',
      APPOINTMENTS: '/api/patient/appointments',
    },
    DOCTOR: {
      APPOINTMENTS: '/api/doctor/appointments',
    },
    ADMIN: {
      STAFF: '/api/admin/staff',
      PATIENTS: '/api/admin/patients',
    },
  },

  // Test Data
  TEST_DATA: {
    DOCTORS: [
      { id: 'doc-1', name: 'Dr. Mukami Gathariki', email: 'mukami.gathariki@nairobisculpt.com' },
      { id: 'doc-2', name: 'Dr. Ken Aluora', email: 'ken.aluora@nairobisculpt.com' },
    ],
  },

  // Retry Configuration
  RETRY: {
    MAX_RETRIES: 2,
    RETRY_DELAY: 1000,
  },

  // Screenshot Configuration
  SCREENSHOTS: {
    ON_FAILURE: true,
    PATH: 'tests/e2e/screenshots',
  },

  // Video Configuration
  VIDEO: {
    ON_FAILURE: true,
    PATH: 'tests/e2e/videos',
  },
};

export default TEST_CONFIG;

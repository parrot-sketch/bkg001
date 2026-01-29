
import { test, expect } from '@playwright/test';

test.describe('Auth Cookie Verification', () => {
    test('should set HttpOnly cookie on login and allow admin access', async ({ request }) => {
        // 1. Login with real admin credentials
        const loginResponse = await request.post('/api/auth/login', {
            data: {
                email: 'admin@nairobisculpt.com',
                password: 'admin123'
            }
        });

        if (loginResponse.status() !== 200) {
            console.log('Login failed. Response:', await loginResponse.text());
        }
        expect(loginResponse.status()).toBe(200);

        // 2. Verify Set-Cookie header
        const headers = loginResponse.headers();
        const setCookie = headers['set-cookie'];
        expect(setCookie).toBeDefined();
        expect(setCookie).toContain('accessToken=');
        expect(setCookie).toContain('HttpOnly');
        expect(setCookie).toContain('Path=/');

        // Extract cookie value for next request (Playwright request context handles cookies automatically if we reuse it, but verify explicitly first)
        // Actually, the `request` fixture tracks state if we use a storage state, but here we just want to verify the cookie allows access.

        // 3. Verify access to protected admin route
        // The `request` context should automatically store cookies from the response for subsequent requests in the same test
        const theatersResponse = await request.get('/api/admin/theaters');
        expect(theatersResponse.status()).toBe(200);

        const data = await theatersResponse.json();
        expect(Array.isArray(data)).toBe(true);
    });

    test('should logout and clear cookie', async ({ request }) => {
        // Login first
        await request.post('/api/auth/login', {
            data: {
                email: 'admin@nairobisculpt.com',
                password: 'admin123'
            }
        });

        // Logout
        const logoutResponse = await request.post('/api/auth/logout');
        expect(logoutResponse.status()).toBe(200);

        // Verify Set-Cookie clears it (Max-Age=0 or Expires in past)
        const headers = logoutResponse.headers();
        const setCookie = headers['set-cookie'];
        expect(setCookie).toBeDefined();
        expect(setCookie).toContain('accessToken=;'); // Empty value often used to clear
        // OR standard clearing often sets Max-Age=0

        // Verify access denied
        const theatersResponse = await request.get('/api/admin/theaters');
        expect(theatersResponse.status()).toBe(401);
    });
});

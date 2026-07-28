/**
 * Test Environment Mocks
 *
 * Provides helpers for setting environment variables and other
 * test-environment specific globals.
 */

export function mockEnvVariable(name: string, value: string | undefined): void {
  process.env[name] = value;
  if (name.startsWith('NEXT_PUBLIC_')) {
    (globalThis as any)[name] = value;
  }
}

export function restoreEnvVariable(name: string): void {
  delete process.env[name];
  if (name.startsWith('NEXT_PUBLIC_')) {
    delete (globalThis as any)[name];
  }
}

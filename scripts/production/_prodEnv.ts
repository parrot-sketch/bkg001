import { readFileSync } from 'fs';

export function loadProductionDatabaseUrlFromEnvFile(envPath = '.env.production'): string {
  const env = readFileSync(envPath, 'utf-8');
  const match = env.match(/^\s*DATABASE_URL\s*=\s*\"([^\"]+)\"\s*$/m);
  if (!match) {
    throw new Error(`Could not find DATABASE_URL in ${envPath}`);
  }
  return match[1];
}


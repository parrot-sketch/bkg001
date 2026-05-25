import { readFileSync } from 'fs';

export function loadProductionDatabaseUrlFromEnvFile(envPath = '.env.production'): string {
  const env = readFileSync(envPath, 'utf-8');
  const direct = env.match(/^\s*DIRECT_URL\s*=\s*\"([^\"]+)\"\s*$/m);
  if (direct?.[1]) return direct[1];

  const pooled = env.match(/^\s*DATABASE_URL\s*=\s*\"([^\"]+)\"\s*$/m);
  if (pooled?.[1]) return pooled[1];

  throw new Error(`Could not find DIRECT_URL or DATABASE_URL in ${envPath}`);
}

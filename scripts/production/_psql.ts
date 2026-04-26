import { execFileSync } from 'child_process';

export type PsqlExecResult = { stdout: string };

export function runPsql(databaseUrl: string, sql: string): PsqlExecResult {
  const stdout = execFileSync(
    'psql',
    [
      databaseUrl,
      '--no-psqlrc',
      '-X',
      '-v',
      'ON_ERROR_STOP=1',
      '-P',
      'pager=off',
      '-q',
      '-tA',
      '-c',
      sql,
    ],
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
  );

  return { stdout };
}

export function runPsqlFile(databaseUrl: string, filePath: string): void {
  execFileSync(
    'psql',
    [
      databaseUrl,
      '--no-psqlrc',
      '-X',
      '-v',
      'ON_ERROR_STOP=1',
      '-P',
      'pager=off',
      '-f',
      filePath,
    ],
    { stdio: 'inherit' },
  );
}


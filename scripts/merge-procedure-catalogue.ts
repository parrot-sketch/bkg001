/**
 * Insert cosmetic catalogue procedures that are not already in
 * surgical_procedure_options.
 *
 * Reads PROD_DIRECT_URL. Does not update or delete existing rows.
 *
 *   npx tsx scripts/merge-procedure-catalogue.ts            # preview
 *   npx tsx scripts/merge-procedure-catalogue.ts --apply    # insert missing rows
 */

import 'dotenv/config';
import { readFileSync } from 'fs';
import { randomUUID } from 'crypto';
import pg from 'pg';
import {
  planCatalogueMerge,
  type CatalogueProcedure,
} from '../lib/clinical/procedureCatalogueMerge';

const apply = process.argv.includes('--apply');
const sourceUrl = (process.env.PROD_DIRECT_URL || '').trim();

if (!sourceUrl) {
  console.error('PROD_DIRECT_URL is not set in .env');
  process.exit(1);
}

function connectionString(url: string): string {
  return url.replace(/([?&])sslmode=[^&]*/g, '$1').replace(/[?&]$/, '');
}

async function main() {
  const catalogue = JSON.parse(readFileSync('data/procedures_catalog.json', 'utf8')) as CatalogueProcedure[];
  const client = new pg.Client({
    connectionString: connectionString(sourceUrl),
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();

  try {
    const existing = await client.query<{ name: string }>('SELECT name FROM surgical_procedure_options');
    const plan = planCatalogueMerge(existing.rows, catalogue);

    console.log(`Catalogue rows: ${catalogue.length}`);
    console.log(`Already in the database: ${plan.alreadyPresent.length}`);
    console.log(`Repeated inside the file: ${plan.duplicateInFile.length}`);
    console.log(`To insert: ${plan.insert.length}`);
    for (const row of plan.insert) {
      const group = row.subcategory ? `${row.category} / ${row.subcategory}` : row.category;
      console.log(`  + ${row.name}  [${group}]`);
    }

    if (!apply) {
      console.log('Preview only. Re-run with --apply to insert these rows.');
      return;
    }

    if (plan.insert.length === 0) {
      console.log('Nothing to insert.');
      return;
    }

    await client.query('BEGIN');
    for (const row of plan.insert) {
      await client.query(
        `INSERT INTO surgical_procedure_options
           (id, category, subcategory, name, is_active, is_billable, created_at, updated_at)
         VALUES ($1, $2::"ProcedureCategory", $3, $4, true, true, NOW(), NOW())`,
        [randomUUID(), row.category, row.subcategory, row.name],
      );
    }
    await client.query('COMMIT');
    console.log(`Inserted ${plan.insert.length} procedures.`);
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

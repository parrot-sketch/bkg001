#!/usr/bin/env tsx
/**
 * Export Validation Script
 * 
 * Validates that all utility functions exported from utils/index.ts
 * are actually importable and match expected exports.
 * 
 * Usage: tsx scripts/validate-exports.ts
 */

import * as fs from 'fs';
import * as path from 'path';

// Expected exports based on error messages
const EXPECTED_EXPORTS = [
  'formatNumber',
  'calculateAge',
  'calculateBMI',
  'getInitials',
  'generateTimes',
  'daysOfWeek',
  'formatDateTime',
  'calculateDiscount',
];

// Files that import from @/utils
const IMPORTING_FILES = [
  'components/charts/stat-summary.tsx',
  'components/forms/book-appointment.tsx',
  'components/profile-image.tsx',
  'app/(protected)/record/patients/page.tsx',
  'components/appointment/bills-container.tsx',
  'components/appointment/patient-details-card.tsx',
  'components/appointment/vital-signs.tsx',
  'components/available-doctor.tsx',
  'components/medical-history.tsx',
  'components/stat-card.tsx',
  'components/view-appointment.tsx',
  'utils/services/admin.ts',
  'utils/services/doctor.ts',
  'utils/services/patient.ts',
];

interface ValidationResult {
  exportName: string;
  exists: boolean;
  importable: boolean;
  error?: string;
}

async function validateExports(): Promise<void> {
  console.log('🔍 Validating utility exports...\n');

  const utilsPath = path.join(process.cwd(), 'utils', 'index.ts');
  
  if (!fs.existsSync(utilsPath)) {
    console.error('❌ utils/index.ts not found!');
    process.exit(1);
  }

  // Read the utils/index.ts file
  const utilsContent = fs.readFileSync(utilsPath, 'utf-8');
  
  // Check which exports are actually present
  const results: ValidationResult[] = [];
  
  for (const exportName of EXPECTED_EXPORTS) {
    const exists = utilsContent.includes(`export ${exportName === 'daysOfWeek' ? 'const' : 'function'} ${exportName}`) ||
                   utilsContent.includes(`export const ${exportName}`) ||
                   utilsContent.includes(`export function ${exportName}`);
    
    // Try to dynamically import to verify it's actually importable
    let importable = false;
    let error: string | undefined;
    
    try {
      // Use dynamic import with full path
      const utilsModule = await import(path.resolve(utilsPath));
      importable = exportName in utilsModule;
      
      if (!importable) {
        error = `Export "${exportName}" not found in module`;
      }
    } catch (err: any) {
      importable = false;
      error = err.message || 'Import failed';
    }
    
    results.push({
      exportName,
      exists,
      importable,
      error,
    });
  }

  // Print results
  console.log('📊 Export Validation Results:\n');
  
  let allValid = true;
  for (const result of results) {
    const status = result.exists && result.importable ? '✅' : '❌';
    console.log(`${status} ${result.exportName}`);
    
    if (!result.exists) {
      console.log(`   ⚠️  Not found in utils/index.ts`);
      allValid = false;
    }
    
    if (!result.importable) {
      console.log(`   ⚠️  Not importable: ${result.error || 'Unknown error'}`);
      allValid = false;
    }
  }

  // Check for files that import from @/utils
  console.log('\n📁 Checking importing files...\n');
  
  let importIssues = 0;
  for (const filePath of IMPORTING_FILES) {
    const fullPath = path.join(process.cwd(), filePath);
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, 'utf-8');
      const importMatch = content.match(/from ['"]@\/utils['"]/);
      if (importMatch) {
        // Extract what's being imported
        const importLine = content.split('\n').find(line => line.includes('from "@/utils"'));
        if (importLine) {
          console.log(`✅ ${filePath}`);
          console.log(`   ${importLine.trim()}`);
        }
      }
    } else {
      console.log(`⚠️  ${filePath} (file not found)`);
    }
  }

  console.log('\n' + '='.repeat(50));
  
  if (allValid) {
    console.log('✅ All exports are valid and importable!');
    process.exit(0);
  } else {
    console.log('❌ Some exports have issues. Please review above.');
    process.exit(1);
  }
}

// Run validation
validateExports().catch((error) => {
  console.error('❌ Validation failed:', error);
  process.exit(1);
});

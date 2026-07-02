#!/usr/bin/env node

/**
 * Pre-build validation script
 * Runs all syntax checks and tests before building
 * Exits with error code if any check fails
 */

import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

let hasErrors = false;

function runCommand(name, command, cwd = rootDir) {
  console.log(`\n🔍 Running: ${name}...`);
  try {
    execSync(command, { 
      cwd, 
      stdio: 'inherit',
      env: { ...process.env }
    });
    console.log(`✅ ${name} passed`);
  } catch (error) {
    console.error(`❌ ${name} failed`);
    hasErrors = true;
  }
}

console.log('🚀 Starting pre-build checks...\n');

// 1. Backend type check
runCommand('Backend type-check', 'cd backend && npm run type-check');

// 2. Frontend type check
runCommand('Frontend type-check', 'cd frontend && npm run type-check');

// 3. API tests (if available)
runCommand('API tests', 'npm run test:api');

// 4. Prisma schema validation
runCommand('Prisma schema validation', 'cd backend && npx prisma validate');

console.log('\n' + '='.repeat(50));

if (hasErrors) {
  console.error('\n❌ Pre-build checks failed! Fix errors before building.\n');
  process.exit(1);
} else {
  console.log('\n✅ All pre-build checks passed! Ready to build.\n');
  process.exit(0);
}

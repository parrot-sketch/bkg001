#!/bin/bash
# Comprehensive TypeScript Type Checking Script
# This script runs full type checking across the entire project

echo "🔍 Running comprehensive TypeScript type check..."
echo ""

# Run Next.js build which includes type checking
echo "1. Running Next.js build (includes type checking)..."
npm run build 2>&1 | tee /tmp/build-output.log

BUILD_EXIT_CODE=$?

if [ $BUILD_EXIT_CODE -eq 0 ]; then
  echo ""
  echo "✅ Build successful - no type errors found!"
else
  echo ""
  echo "❌ Build failed - type errors detected"
  echo ""
  echo "Type errors summary:"
  grep -E "error TS|Type error|Failed to compile" /tmp/build-output.log | head -20
fi

# Also run direct tsc check (more verbose)
echo ""
echo "2. Running direct TypeScript compiler check..."
npx tsc --noEmit --skipLibCheck 2>&1 | grep -E "error TS" | wc -l | xargs -I {} echo "Found {} TypeScript errors"

exit $BUILD_EXIT_CODE

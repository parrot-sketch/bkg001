# Deployment Troubleshooting Guide

## Overview

This guide covers common issues encountered during GitHub Actions deployments to production and staging environments.

---

## Pre-Deployment Issues

### Issue: GitHub Actions Workflow Not Triggering

**Symptoms:**
- Push to main/develop but workflow doesn't appear in Actions tab
- PR shows no workflow execution

**Common Causes & Solutions:**

```bash
# 1. Check if workflow file is valid YAML
cd /home/bkg/fullstack-healthcare
yamllint .github/workflows/deploy-production.yml

# 2. Verify branch protection rules
# Go to: Settings > Branches > Branch protection rules
# Should be: main and develop branches
# ✅ Require status checks before merging
# ✅ Include administrators

# 3. Check secrets are configured
# Go to: Settings > Secrets and variables > Actions
# Should have: PROD_SSH_PRIVATE_KEY, PROD_SERVER_HOST, etc.

# 4. Verify repository has GitHub Actions enabled
# Settings > Actions > General > Allow all actions and reusable workflows

# 5. Check if workflow is disabled
# Go to Actions tab > Workflows
# Click on "deploy-production.yml"
# If disabled, click "Enable workflow"
```

### Issue: Syntax Error in Workflow File

**Symptoms:**
```
Error: The workflow is not valid. .github/workflows/deploy-production.yml (Line: X, Col: Y): ...
```

**Solutions:**

```bash
# 1. Validate YAML syntax locally
python3 -c "import yaml; yaml.safe_load(open('.github/workflows/deploy-production.yml'))"

# 2. Check for common issues:
# - Indentation (use 2 spaces, not tabs)
# - Missing colons in YAML
# - Unclosed strings or brackets
# - Invalid environment variable syntax

# 3. View actual error in GitHub
# Actions tab > Failed workflow > View error details

# 4. Fix and re-push
git add .github/workflows/deploy-production.yml
git commit -m "fix: workflow YAML syntax"
git push origin main
```

---

## SSH Connection Issues

### Issue: "Permission denied (publickey)" when connecting to server

**Symptoms:**
```
fatal: could not connect to prod server
Permission denied (publickey)
```

**Root Causes:**

```bash
# 1. SSH private key not configured correctly
# Go to: Settings > Secrets and variables > Actions > PROD_SSH_PRIVATE_KEY
# Verify it contains the FULL contents of your private key:
# -----BEGIN OPENSSH PRIVATE KEY-----
# MIIEvQ...
# ...
# -----END OPENSSH PRIVATE KEY-----

# 2. Test the key locally
ssh -i ~/.ssh/github_actions_deploy deploy-user@your-prod-server.com pwd

# If this fails, SSH key issue is confirmed

# 3. Verify public key on server
ssh deploy-user@your-prod-server.com "cat ~/.ssh/authorized_keys"

# Should show: ssh-rsa AAAA... (your public key)

# 4. If key is missing from server, add it:
echo "$(cat ~/.ssh/github_actions_deploy.pub)" | \
  ssh deploy-user@your-prod-server.com "cat >> ~/.ssh/authorized_keys"

# 5. Fix permissions on server
ssh deploy-user@your-prod-server.com "chmod 700 ~/.ssh && chmod 600 ~/.ssh/authorized_keys"
```

### Issue: "Connection timeout" - can't reach production server

**Symptoms:**
```
Timeout waiting for server response
Connection refused on port 22
```

**Solutions:**

```bash
# 1. Verify server is online and reachable
ping your-prod-server.com
ssh -v deploy-user@your-prod-server.com  # Verbose output

# 2. Check firewall allows SSH (port 22)
# Contact infrastructure team if:
# - Server is in private network
# - Firewall rules restrict GitHub Actions IPs

# 3. Verify GitHub Actions runner can reach internet
# Create test workflow:
cat > .github/workflows/test-connection.yml << 'EOF'
on: [push]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - name: Test DNS
        run: nslookup your-prod-server.com
      - name: Test connectivity
        run: curl -v telnet://your-prod-server.com:22
EOF

# 4. If server isn't responding to SSH at all:
# Try connecting from another machine to verify it's not GitHub-specific
```

---

## Deployment Step Issues

### Issue: Database Backup Fails

**Symptoms:**
```
Error: pg_dump: error: could not translate host name "db.example.com" to address
Database backup SKIPPED
```

**Solutions:**

```bash
# 1. Verify database host and credentials in GitHub secrets
# Settings > Secrets > Actions
# Check: PROD_DB_HOST, PROD_DB_USER, PROD_DB_PASSWORD

# 2. Test backup manually from production server
ssh deploy-user@your-prod-server.com
PGPASSWORD='password' pg_dump \
  -h db.example.com \
  -U db_user \
  -d healthcare \
  > /tmp/test-backup.sql

# 3. If that works, issue might be with workflow environment
# Add debug step to workflow:
- name: Test DB Connection
  run: |
    psql -h ${{ secrets.PROD_DB_HOST }} \
      -U ${{ secrets.PROD_DB_USER }} \
      -d ${{ secrets.PROD_DB_NAME }} \
      -c "SELECT 1"

# 4. If database is in private network:
# Need to SSH to prod server first, then run pg_dump from there
# (This is what the workflow does with SSH tunneling)

# 5. Check backup directory has space
ssh deploy-user@your-prod-server.com "df -h /backups"
```

### Issue: "npm ci" Fails - Dependency Installation Error

**Symptoms:**
```
npm ERR! code E401
npm ERR! Unauthorized
```

**Solutions:**

```bash
# 1. Check package-lock.json is committed
git log --oneline package-lock.json

# 2. Verify npm token if using private packages
# Settings > Secrets > NPM_TOKEN should be configured

# 3. If using GitHub Packages:
# Add .npmrc to repository root:
echo "//npm.pkg.github.com/:_authToken=\${{ secrets.GITHUB_TOKEN }}" > .npmrc

# 4. Check for conflicting lockfile versions
npm ci --no-optional --no-save

# 5. If lockfile is corrupted, regenerate:
# (Do this on local machine first, test)
rm package-lock.json
npm install
git add package-lock.json
git commit -m "fix: regenerate lockfile"
git push
```

### Issue: Prisma Generate Fails

**Symptoms:**
```
Error: Could not find a suitable schema.prisma file
or
Error: Generator "prisma-client" with output "node_modules/@prisma/client" exited with code 1
```

**Solutions:**

```bash
# 1. Verify prisma/schema.prisma exists in repo
git ls-files | grep schema.prisma

# 2. Check schema.prisma for syntax errors
npx prisma validate

# 3. Check for uncommitted changes
git status prisma/schema.prisma

# 4. Regenerate Prisma client locally
npx prisma generate

# 5. Commit and push
git add prisma/
git commit -m "fix: regenerate Prisma client"
git push
```

### Issue: Database Migration Fails

**Symptoms:**
```
Error: P1000 Authentication failed against database server
or
Error: Migration M001 failed
```

**Root Causes & Solutions:**

```bash
# 1. Database not reachable
ssh deploy-user@your-prod-server.com
psql -h $PROD_DB_HOST -U $PROD_DB_USER -d $PROD_DB_NAME -c "SELECT 1"

# 2. Migration has SQL syntax errors
# Check the migration file:
cat prisma/migrations/20260406XXXXXX/migration.sql

# 3. Migration creates conflicting schema
# Example: Trying to create column that already exists
# Solution: Check current schema first:
npx prisma db pull

# 4. If migration is stuck (never completed)
ssh deploy-user@your-prod-server.com
npx prisma migrate status

# See which migration is stuck, then:
npx prisma migrate resolve --rolled-back <MIGRATION_NAME>

# 5. Manual recovery - check for active queries blocking migration
ssh postgres@db.example.com
SELECT * FROM pg_stat_activity WHERE state = 'active';
SELECT pg_terminate_backend(pid) FROM pg_stat_activity 
  WHERE pid <> pg_backend_pid() AND datname = 'healthcare';

# 6. Re-run migration
npx prisma migrate deploy
```

### Issue: "npm run build" Fails

**Symptoms:**
```
Error: Failed to compile
./pages/api/health/route.ts: Unexpected token
or
Error: Build optimization failed
```

**Solutions:**

```bash
# 1. Test build locally first
npm run build

# Make sure it works before pushing

# 2. Check for TypeScript errors
npx tsc --noEmit

# 3. Fix any type errors
# Example: If health endpoint has wrong return type:
git diff app/api/health/route.ts

# 4. Check NODE_ENV
# Workflow should have NODE_ENV=production

# 5. Check for missing environment variables
# Build might fail if ENV vars not set
# Solution: Add to workflow:
- name: Build
  env:
    DATABASE_URL: ${{ secrets.PROD_DATABASE_URL }}
  run: npm run build

# 6. Check next.config.js for build-time errors
cat next.config.js
```

---

## Health Check Issues

### Issue: Health Check Times Out After 60 Seconds

**Symptoms:**
```
Deployment failed: Health check failed after 30 attempts (60s timeout)
App not responding to /api/health
```

**Solutions:**

```bash
# 1. SSH to server and check if app started
ssh deploy-user@your-prod-server.com
pm2 list

# 2. Check PM2 logs immediately
pm2 logs healthcare-app-prod --err | tail -50

# 3. Check if port 3000 is in use
lsof -i :3000

# 4. Kill process and try starting manually
pm2 kill
npm run build
pm2 start ecosystem.config.js

# 5. Try accessing health endpoint manually
curl -v http://localhost:3000/api/health

# 6. If endpoint itself has code errors:
# Check /app/api/health/route.ts
cat /app/fullstack-healthcare/app/api/health/route.ts

# 7. Check database connectivity from app
psql -h $PROD_DB_HOST -U $PROD_DB_USER -d healthcare -c "SELECT COUNT(*) FROM \"Vendor\";"
```

### Issue: Health Check Returns 503 (Unhealthy)

**Symptoms:**
```
GET /api/health returns: {"status": "unhealthy", "checks": {"database": "timeout"}}
```

**Solutions:**

```bash
# 1. Check database is reachable
ssh deploy-user@your-prod-server.com
psql -h db.example.com -U db_user -d healthcare -c "\dt"

# 2. Check database connection pool
# In app logs:
pm2 logs | grep -i "pool\|connection"

# 3. Increase database connection timeout
# In ecosystem.config.js:
# env: {
#   DATABASE_CONNECTION_TIMEOUT: '10000',
# }

# 4. Check network connectivity from app to DB
ping db.example.com
curl http://db.example.com:5432  # Verify port

# 5. Test Prisma connection directly
ssh deploy-user@your-prod-server.com
cd /app/fullstack-healthcare
npx prisma db execute --stdin < <<EOF
SELECT 1;
EOF
```

---

## Post-Deployment Issues

### Issue: App is Running but SQL Queries Fail

**Symptoms:**
```
Health endpoint returns 200, but API endpoints return 500 with DB errors
```

**Solutions:**

```bash
# 1. Verify migrations actually ran
ssh deploy-user@your-prod-server.com
cd /app/fullstack-healthcare
npx prisma migrate status

# Should show: "Database is up to date"

# 2. Check for migration failures
npx prisma migrate status --verbose

# 3. Regenerate Prisma client
npx prisma generate

# 4. If migrations didn't run, manually apply:
npx prisma migrate deploy

# 5. Check database schema matches Prisma schema
npx prisma db pull
# If schema.prisma changed, there's a mismatch
git diff prisma/schema.prisma
```

### Issue: Feature Not Working After Deployment

**Symptoms:**
- Health check is green (200 OK)
- But new feature returns 404 or behaves wrongly
- Works on local dev but not production

**Solutions:**

```bash
# 1. Verify correct code was deployed
ssh deploy-user@your-prod-server.com
cd /app/fullstack-healthcare
git log --oneline -1

# Should show your latest commit hash

# 2. Check if app was actually restarted with new code
pm2 status
pm2 restart healthcare-app-prod

# 3. Verify Next.js was rebuilt
ls -la .next/
# Should be recent timestamp

# 4. Check for build-time environment variable issues
env | grep NEXT_PUBLIC

# 5. Check feature branch was merged correctly
git log --oneline -5
git diff HEAD~1 HEAD -- app/

# 6. Manually trigger a local build to verify
npm run build
npm start
```

---

## Rollback Issues

### Issue: Automatic Rollback Failed

**Symptoms:**
```
Rollback job failed: could not revert to previous commit
```

**Solutions:**

```bash
# 1. Manually check git history
ssh deploy-user@your-prod-server.com
cd /app/fullstack-healthcare
git log --oneline -10

# 2. Manually revert to previous commit
git reset --hard HEAD~1
git pull

# 3. Rebuild and restart
npm run build
pm2 restart healthcare-app-prod

# 4. If that doesn't work, restore from backup
# See "Restore from Backup" in Operations Runbook

# 5. After fixing, force-push if needed (CAREFULLY):
# This is ONLY after manual recovery
git force-push origin main  # DANGEROUS - confirm with team first
```

---

## Debugging Workflow Logs

### Access Detailed Workflow Logs

```bash
# 1. Go to GitHub Actions tab
# 2. Click on failed workflow run
# 3. Click on job (e.g., "deploy-production")
# 4. Expand any failed step
# 5. Look for error message and line number

# Common sections to check:
# - "Pre-deployment checks" (validation errors)
# - "Deploy production > Install dependencies" (npm errors)
# - "Deploy production > Database migration" (schema errors)
# - "Deploy production > Health check" (app startup issues)
# - "Rollback" (if deployment failed)
```

### Enable Debug Logging

Add to workflow file temporarily:

```yaml
- name: Enable debug logging
  run: |
    set -x  # Print every command
    echo "Debug mode enabled"
    
- name: Check environment
  run: |
    echo "Secrets configured: ${{ secrets.PROD_SSH_PRIVATE_KEY != '' }}"
    echo "Server host: ${{ secrets.PROD_SERVER_HOST }}"
    echo "App path: ${{ secrets.PROD_APP_PATH }}"
```

---

## When to Rollback

**Automatic rollback will trigger if:**
- Health check fails 30 times
- Database migration fails and can't be rolled back
- App startup fails

**Manual rollback when:**
- Feature is causing data corruption
- Security vulnerability found
- Critical bug affecting users

---

## Getting Help

If you can't resolve an issue:

1. **Check logs first:**
   - GitHub Actions workflow logs
   - App logs: `pm2 logs healthcare-app-prod`
   - Database logs: Check with database admin

2. **Ask DevOps team:**
   - Slack: @devops-team
   - Email: devops@example.com

3. **Provide:**
   - GitHub workflow run URL
   - Error message and line number
   - When it started happening
   - Any recent changes to code/infrastructure

---

**Last Updated:** 2026-04-06
**Maintained By:** DevOps Team

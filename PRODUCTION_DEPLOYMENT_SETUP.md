# Production Deployment: Complete Configuration Guide

## Overview

This guide walks through setting up enterprise-grade automated deployment with GitHub Actions, database migrations, and rollback capabilities.

**Timeline:** ~2 hours total (30 min setup, 1.5 hours testing)

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    GitHub Repository                         │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ .github/workflows/                                     │  │
│  │ ├── deploy-production.yml  (main → production)        │  │
│  │ ├── deploy-staging.yml     (develop → staging)        │  │
│  │ └── ci.yml                 (existing tests)           │  │
│  └────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
            ┌───────────────────────────────┐
            │  GitHub Actions Runners       │
            │  (Automated Workflows)        │
            └───────────────────────────────┘
                            │
           ┌────────────────┴───────────────┐
           ▼                                 ▼
    ┌─────────────────────────┐    ┌─────────────────────────┐
    │  Staging Environment    │    │  Production Environment │
    │                         │    │                         │
    │  SSH into staging       │    │  SSH into production    │
    │  ├─ Pull code           │    │  ├─ Pull code           │
    │  ├─ Backup DB           │    │  ├─ Backup DB           │
    │  ├─ Run migrations      │    │  ├─ Run migrations      │
    │  ├─ Build app           │    │  ├─ Build app           │
    │  └─ Restart services    │    │  └─ Restart services    │
    │                         │    │                         │
    │  Database changes       │    │  Database changes       │
    │  (mirror of prod)       │    │  (LIVE - backed up)     │
    └─────────────────────────┘    └─────────────────────────┘
```

---

## Step 1: Generate SSH Key Pair

### 1a. On your local machine, generate SSH keys:

```bash
# Generate SSH key for deployment (no passphrase)
ssh-keygen -t rsa -b 4096 -f ~/.ssh/github_actions_deploy -N ""

# This creates two files:
# ~/.ssh/github_actions_deploy          (PRIVATE KEY - keep secret)
# ~/.ssh/github_actions_deploy.pub      (PUBLIC KEY - share with servers)
```

### 1b. View the keys:

```bash
# View PRIVATE key (you'll need this for GitHub)
cat ~/.ssh/github_actions_deploy

# View PUBLIC key (you'll need this for production server)
cat ~/.ssh/github_actions_deploy.pub
```

---

## Step 2: Configure Production Server

SSH into your production server and set up deployment user and SSH access:

```bash
# SSH into your production server
ssh your-current-user@your-prod-server.com

# Create deployment user (if not exists)
sudo useradd -m deploy-user
sudo usermod -aG sudo deploy-user

# Create .ssh directory for deployment user
sudo -u deploy-user mkdir -p /home/deploy-user/.ssh
sudo chmod 700 /home/deploy-user/.ssh

# Add GitHub Actions public key
echo "ssh-rsa AAAA..." | sudo tee /home/deploy-user/.ssh/authorized_keys
# (Paste the contents of ~/.ssh/github_actions_deploy.pub)

sudo chmod 600 /home/deploy-user/.ssh/authorized_keys

# Create app directory
sudo mkdir -p /app/fullstack-healthcare
sudo chown deploy-user:deploy-user /app/fullstack-healthcare
cd /app/fullstack-healthcare

# Setup Git
git init --bare ../repo.git
git config --global user.email "deploy@example.com"
git config --global user.name "GitHub Actions"

# Install PM2 globally (app process manager)
sudo npm install -g pm2
sudo pm2 startup
sudo pm2 save

# Create ecosystem.config.js for PM2
cat > /home/deploy-user/ecosystem.config.js << 'EOF'
module.exports = {
  apps: [
    {
      name: 'healthcare-app-prod',
      script: 'node_modules/.bin/next',
      args: 'start',
      instances: 'max',
      exec_mode: 'cluster',
      max_memory_restart: '500M',
      error_file: './logs/error.log',
      out_file: './logs/out.log',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      autorestart: true,
      watch: false,
    },
  ],
};
EOF

# Create logs directory
mkdir -p /app/fullstack-healthcare/logs

# Setup log rotation
sudo cat > /etc/logrotate.d/healthcare-app << 'EOF'
/app/fullstack-healthcare/logs/*.log {
  daily
  rotate 7
  compress
  delaycompress
  missingok
  notifempty
}
EOF

# Setup backups directory
sudo mkdir -p /backups
sudo chown deploy-user:deploy-user /backups

# Verify deployment user can access app directory
sudo -u deploy-user ls -la /app/fullstack-healthcare
```

### 2a. Create `.env.production` on server:

```bash
sudo -u deploy-user tee /app/fullstack-healthcare/.env.production > /dev/null << 'EOF'
NODE_ENV=production
DATABASE_URL=postgresql://user:password@db-hostname:5432/db_name
DIRECT_URL=postgresql://user:password@db-hostname:5432/db_name
JWT_SECRET=your-super-secret-key-here-min-32-chars
JWT_REFRESH_SECRET=your-super-secret-refresh-key-here
NEXTAUTH_URL=https://your-production-domain.com
NEXTAUTH_SECRET=your-nextauth-secret-key-here
PORT=3000
EOF

# Verify the file
sudo -u deploy-user cat /app/fullstack-healthcare/.env.production
```

---

## Step 3: Configure GitHub Repository Secrets

### 3a. Go to GitHub repository settings:

1. Navigate to: **Settings > Secrets and variables > Actions**
2. Click "New repository secret"

### 3b. Add Production Secrets:

Create these secrets in exact order:

| Secret Name | Value |
|------------|-------|
| `PROD_SSH_PRIVATE_KEY` | Contents of `~/.ssh/github_actions_deploy` (private key) |
| `PROD_SSH_USER` | `deploy-user` |
| `PROD_SERVER_HOST` | `your-prod-server.com` |
| `PROD_APP_PATH` | `/app/fullstack-healthcare` |
| `PROD_DB_HOST` | Your PostgreSQL host (e.g., `postgres.example.com`) |
| `PROD_DB_USER` | Database username |
| `PROD_DB_PASSWORD` | Database password |
| `PROD_DB_NAME` | Database name |
| `SLACK_WEBHOOK` | (Optional) Slack webhook URL for notifications |

### 3c. Add Staging Secrets:

| Secret Name | Value |
|------------|-------|
| `STAGING_SSH_PRIVATE_KEY` | SSH private key for staging |
| `STAGING_SSH_USER` | `deploy-user` |
| `STAGING_SERVER_HOST` | `staging-server.com` |
| `STAGING_APP_PATH` | `/app/fullstack-healthcare` |

---

## Step 4: Set Environment Protection Rules

### 4a. In GitHub, create deployment environments:

1. Go to **Settings > Environments**
2. Click "New environment"
3. Name: `production`
4. Click "Configure environment"

### 4b. For Production Environment:

- **Deployment branches:**
  - Select "Protected branches only"
  - Add rule: `main`

- **Required reviewers:** (Recommended)
  - ✅ Enable check
  - Add your team members
  - Require at least 1 approval before production deploy

- **Environment secrets:** (Optional)
  - Can override repo secrets for this environment

### 4c. Repeat for Staging Environment:

- Name: `staging`
- Deployment branches: `develop`
- No required reviewers (auto-deploy when develop changes)

---

## Step 5: Test the Deployment Pipeline

### Phase 1: Test on Staging First

```bash
# 1. Create a test branch from develop
git checkout develop
git checkout -b test/deployment-workflow

# 2. Make a small change
echo "# Test deployment" >> README.md

# 3. Commit and push
git add README.md
git commit -m "test: deployment workflow"
git push origin test/deployment-workflow

# 4. Create PR to develop
# Go to GitHub, create PR, review, merge

# 5. Watch the workflow
# Go to Actions tab, watch deploy-staging.yml run
# Should complete in ~15-20 minutes

# 6. Verify staging app
curl https://staging.your-domain.com/api/health
```

### Phase 2: Test Database Migration on Staging

```bash
# 1. Create migration test branch
git checkout develop
git checkout -b test/migration-feature

# 2. Add a small schema change (non-breaking)
# Edit prisma/schema.prisma:
# Add a new field like: test_field String? to any model

# 3. Generate migration
npx prisma migrate dev --name test_field_added

# 4. Push and create PR to develop
git add prisma/
git commit -m "test: add test field migration"
git push origin test/migration-feature

# 5. Merge PR and watch workflow execute
# Verify migrations ran successfully:
curl https://staging.your-domain.com/api/health?detailed=true | jq '.diagnostics'
```

### Phase 3: Test Production Deployment

```bash
# 1. After staging tests pass, merge develop → main
git checkout main
git merge develop

# 2. GitHub Actions will notice the push to main
# -> Workflow requires approval (if you set reviewers)
# -> Go to Actions tab, review deployment, approve

# 3. Watch production deployment execute
# Should take ~20-30 minutes:
#   - Pre-checks: 2 min
#   - DB backup: 3 min
#   - Migration: 5 min
#   - Build: 10 min
#   - Restart: 2 min
#   - Health check: 1 min

# 4. Monitor production
curl https://your-production-domain.com/api/health

# 5. Check app logs
ssh deploy-user@your-prod-server.com
pm2 logs healthcare-app-prod | head -50
```

---

## Workflow Files Summary

### `.github/workflows/deploy-production.yml`

**Triggers:** Push to main branch OR manual dispatch

**Jobs:**
1. **pre-deployment-checks** (10 min)
   - Validates migration files
   - Type-checks code
   - Ensures no breaking changes

2. **deploy-production** (20 min)
   - Creates database backup
   - Pulls latest code
   - Runs migrations
   - Builds app
   - Restarts services
   - Runs smoke tests

3. **rollback-on-failure**
   - Automatically reverts if deployment fails

### `.github/workflows/deploy-staging.yml`

**Triggers:** Push to develop branch OR manual dispatch

**Jobs:**
1. **pre-deployment-checks** (10 min)
2. **deploy-staging** (15 min) - Same as production but for staging

---

## Database Backup Strategy

### Automatic Backups

The deployment script automatically creates backups before running migrations:

```bash
/backups/db-backup-20260406-143022.sql
/backups/db-backup-20260406-120015.sql
/backups/db-backup-20260406-100500.sql
```

### Manual Backup

If you need to backup manually:

```bash
ssh deploy-user@your-prod-server.com

# Full database backup
PGPASSWORD=your_db_password pg_dump \
  -h postgres.example.com \
  -U db_user \
  -d db_name \
  > backup-$(date +%Y%m%d-%H%M%S).sql
```

### Restore from Backup

If something goes wrong:

```bash
# Restore specific backup
PGPASSWORD=your_db_password psql \
  -h postgres.example.com \
  -U db_user \
  -d db_name \
  < /backups/db-backup-20260406-143022.sql
```

---

## Rollback Procedures

### Automatic Rollback

If production deployment fails:
1. Workflow automatically triggers rollback job
2. Reverts to previous git commit
3. Restarts application with old code
4. Notification sent to Slack

### Manual Rollback

If needed, SSH into production and:

```bash
cd /app/fullstack-healthcare

# See recent commits
git log --oneline -5

# Revert to previous commit
git revert HEAD --no-edit
git pull

# Re-run migrations (rollback)
npx prisma migrate resolve --rolled-back <MIGRATION_NAME>

# Rebuild
npm run build

# Restart
pm2 restart ecosystem.config.js --env production

# Verify
curl https://your-prod-domain.com/api/health
```

---

## Health Check Endpoint

The deployment workflows use `GET /api/health` to verify app is running.

### Endpoints:

**Simple health check:**
```bash
curl https://your-production-domain.com/api/health

# Response:
{
  "status": "healthy",
  "timestamp": "2026-04-06T14:30:22Z",
  "uptime": 3600,
  "checks": {
    "database": "ok",
    "api": "ok"
  },
  "version": "0.1.0",
  "environment": "production"
}
```

**Detailed diagnostics (for monitoring):**
```bash
curl https://your-production-domain.com/api/health?detailed=true

# Response includes:
{
  ...base response,
  "diagnostics": {
    "database": {
      "latency_ms": 42,
      "connection_pool_available": 1
    },
    "memory": {
      "heap_used_mb": 245,
      "heap_total_mb": 512,
      "external_mb": 12
    },
    "process": {
      "uptime_seconds": 3600,
      "pid": 1234
    }
  }
}
```

---

## Slack Notifications

If you provide a Slack webhook URL, you'll get notifications:

### Setup Slack:

1. Go to Slack workspace
2. Create webhook: https://api.slack.com/messaging/webhooks
3. Add URL as `SLACK_WEBHOOK` secret in GitHub

### Notification Examples:

```
✅ Production Deployment Successful
Branch: main
Commit: abc1234
Author: developer-name
```

---

## Troubleshooting

### Deployment stuck at "Health Check"

```bash
# SSH into server
ssh deploy-user@your-prod-server.com

# Check if app is running
pm2 list

# Check logs
pm2 logs healthcare-app-prod | tail -20

# Try restarting
pm2 restart healthcare-app-prod
```

### Migration failed

```bash
# Check migration status
npx prisma migrate status

# Resolve failed migration
npx prisma migrate resolve --rolled-back <MIGRATION_NAME>

# Or skip problematic migration
npx prisma migrate resolve --skip
```

### SSH connection refused

```bash
# Verify SSH key
ssh -i ~/.ssh/github_actions_deploy deploy-user@your-prod-server.com

# Check production server SSH config
sudo sshd -t  # Test SSH config syntax
```

---

## Post-Deployment Verification Checklist

After each deployment, verify:

- [ ] Health check returns 200 OK
- [ ] Database migrations applied (`prisma migrate status`)
- [ ] New features working in staging first
- [ ] No 500 errors in application logs
- [ ] Slack notification received (if configured)
- [ ] Backups created successfully
- [ ] Previous functionality still works (no regression)

---

## Monitoring & Maintenance

### Weekly Checks

```bash
# Login to production
ssh deploy-user@your-prod-server.com

# Check app status
pm2 list

# Check disk space
df -h

# Check backups
ls -lah /backups/ | head -10

# Check logs for errors
pm2 logs healthcare-app-prod --err | tail -50
```

### Cleanup Old Backups

The deployment script keeps last 7 days of backups. To manually clean:

```bash
find /backups -name "db-backup-*.sql" -mtime +7 -delete
```

---

## Next Steps

1. ✅ Generate SSH keys
2. ✅ Configure production server
3. ✅ Add GitHub secrets
4. ✅ Set environment protection rules
5. ✅ Test on staging
6. ✅ Test database migration
7. ✅ Test production deployment
8. ✅ Monitor first production deploy closely

**You're now ready for enterprise-grade automated deployments!** 🚀

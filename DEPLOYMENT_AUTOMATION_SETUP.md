# Production Deployment Automation Setup Guide

## Quick Start: Add Automated Production Deployment

### Step 1: Create GitHub Actions Workflow

Create file: `.github/workflows/deploy-production.yml`

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]
  workflow_dispatch:  # Allow manual trigger from GitHub UI

jobs:
  deploy:
    name: Deploy to Production
    runs-on: ubuntu-latest
    # Add environment protection rule in GitHub settings:
    # Settings > Environments > Create "production" environment > Add reviewers
    environment:
      name: production
      url: https://your-production-domain.com
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Configure SSH key
        run: |
          mkdir -p ~/.ssh
          echo "${{ secrets.PROD_SSH_PRIVATE_KEY }}" > ~/.ssh/id_rsa
          chmod 600 ~/.ssh/id_rsa
          ssh-keyscan -H ${{ secrets.PROD_SERVER_HOST }} >> ~/.ssh/known_hosts

      - name: Deploy application
        run: |
          ssh -i ~/.ssh/id_rsa ${{ secrets.PROD_SSH_USER }}@${{ secrets.PROD_SERVER_HOST }} << 'EOF'
          set -e  # Exit on error
          
          echo "=== Starting Production Deployment ==="
          cd ${{ secrets.PROD_APP_PATH }}
          
          echo "1. Pulling latest changes..."
          git fetch origin main
          git checkout origin/main
          
          echo "2. Installing dependencies..."
          npm ci --omit=dev
          
          echo "3. Generating Prisma client..."
          npx prisma generate
          
          echo "4. Running database migrations..."
          npx prisma migrate deploy
          
          echo "5. Building application..."
          npm run build
          
          echo "6. Restarting application..."
          pm2 restart ecosystem.config.js --env production || pm2 start ecosystem.config.js --env production
          
          echo "=== Deployment completed successfully ==="
          EOF

      - name: Run smoke tests
        run: |
          echo "Running post-deployment health checks..."
          curl -f https://your-production-domain.com/api/health || exit 1
          curl -f https://your-production-domain.com/api/stores/vendors || exit 1

      - name: Notify deployment success
        if: success()
        uses: 8398a7/action-slack@v3
        with:
          status: success
          text: "✅ Production deployment succeeded"
          webhook_url: ${{ secrets.SLACK_WEBHOOK }}
          fields: |
            repo,message,commit,author

      - name: Notify deployment failure
        if: failure()
        uses: 8398a7/action-slack@v3
        with:
          status: failure
          text: "❌ Production deployment FAILED - Manual intervention needed"
          webhook_url: ${{ secrets.SLACK_WEBHOOK }}
          fields: |
            repo,message,commit,author,action

      - name: Cleanup SSH key
        if: always()
        run: rm -f ~/.ssh/id_rsa
```

---

### Step 2: Create Staging Deployment Workflow

Create file: `.github/workflows/deploy-staging.yml`

```yaml
name: Deploy to Staging

on:
  push:
    branches: [develop]
  workflow_dispatch:

jobs:
  deploy:
    name: Deploy to Staging
    runs-on: ubuntu-latest
    environment:
      name: staging
      url: https://staging.your-domain.com

    steps:
      - uses: actions/checkout@v4

      - name: Configure SSH
        run: |
          mkdir -p ~/.ssh
          echo "${{ secrets.STAGING_SSH_PRIVATE_KEY }}" > ~/.ssh/id_rsa
          chmod 600 ~/.ssh/id_rsa
          ssh-keyscan -H ${{ secrets.STAGING_SERVER_HOST }} >> ~/.ssh/known_hosts

      - name: Deploy to staging
        run: |
          ssh ${{ secrets.STAGING_SSH_USER }}@${{ secrets.STAGING_SERVER_HOST }} << 'EOF'
          set -e
          cd ${{ secrets.STAGING_APP_PATH }}
          git fetch origin develop && git checkout origin/develop
          npm ci
          npx prisma migrate deploy
          npm run build
          pm2 restart staging-app
          EOF

      - name: Run integration tests against staging
        run: |
          curl -f https://staging.your-domain.com/api/health

      - name: Slack notification
        if: always()
        uses: 8398a7/action-slack@v3
        with:
          status: ${{ job.status }}
          webhook_url: ${{ secrets.SLACK_WEBHOOK }}
```

---

### Step 3: Configure GitHub Secrets

In your repository: **Settings > Secrets and variables > Actions**

Add these secrets:

```
PROD_SSH_PRIVATE_KEY          = (private SSH key, no passphrase)
PROD_SSH_USER                 = deploy-user (or your SSH user)
PROD_SERVER_HOST              = your-prod-server.example.com
PROD_APP_PATH                 = /app (path where app is deployed)

STAGING_SSH_PRIVATE_KEY       = (staging private key)
STAGING_SSH_USER              = deploy-user
STAGING_SERVER_HOST           = staging-server.example.com
STAGING_APP_PATH              = /app

SLACK_WEBHOOK                 = https://hooks.slack.com/... (optional)
```

---

### Step 4: Set Environment Protection Rules

In GitHub:
1. Go to **Settings > Environments**
2. Create `production` environment
3. Under "Deployment branches", select "Protected branches only"
4. Under "Reviewers", add team members who approve prod deployments
5. Repeat for `staging` if desired

---

### Step 5: Prepare Production Server

SSH into production server and:

```bash
# Create deployment user (if not exists)
sudo useradd -m deploy-user
sudo -u deploy-user mkdir -p ~/.ssh

# Add GitHub Actions runner public key
# (Get this from: ssh-keygen -f prod_deploy_key, then add pub key)
echo "ssh-rsa AAAA..." | sudo tee /home/deploy-user/.ssh/authorized_keys

# Setup app directory
sudo mkdir -p /app && sudo chown deploy-user:deploy-user /app

# Install PM2 globally (app process manager)
sudo npm install -g pm2

# Create ecosystem config for PM2
cat > /app/ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'healthcare-app',
    script: 'node_modules/.bin/next',
    args: 'start',
    instances: 'max',
    exec_mode: 'cluster',
    max_memory_restart: '500M',
    error_file: './logs/error.log',
    out_file: './logs/out.log',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }]
};
EOF

# Setup PM2 to start on reboot
pm2 startup
pm2 save
```

---

### Step 6: Database Backup Before Migrations

Add backup step to deployment script:

```bash
# Before running migrations
BACKUP_FILE="/backups/db-backup-$(date +%Y%m%d-%H%M%S).sql"
mkdir -p /backups

PGPASSWORD=$DB_PASSWORD pg_dump \
  -h $DB_HOST \
  -U $DB_USER \
  -d $DB_NAME \
  --no-password \
  > $BACKUP_FILE

echo "Backup created: $BACKUP_FILE"

# Keep only last 7 backups
find /backups -name "db-backup-*.sql" -mtime +7 -delete
```

---

### Step 7: Rollback Procedure

If deployment fails, have a rollback script `.scripts/rollback-production.sh`:

```bash
#!/bin/bash
set -e

echo "Rolling back to previous release..."

ssh $PROD_SSH_USER@$PROD_SERVER_HOST << 'EOF'
  cd /app
  
  # Get previous git commit
  git log --oneline -2
  git revert HEAD --no-edit
  
  # Rollback database (if migrations changed data structure)
  npx prisma migrate resolve --rolled-back <MIGRATION_NAME>
  
  # Rebuild and restart
  npm run build
  pm2 restart ecosystem.config.js
  
  echo "Rollback complete"
EOF
```

**Usage:**
```bash
bash .scripts/rollback-production.sh
```

---

## Testing the Workflow

### Test on Develop → Staging
1. Make a small change to schema
2. Commit to `develop` branch
3. Watch `.github/workflows/deploy-staging.yml` execute
4. Verify staging deployment succeeded
5. Test endpoints manually

### Test on Main → Production
1. After testing on staging, merge to `main`
2. GitHub will require approval (environment setting)
3. Approver reviews, clicks "Approve and deploy"
4. Watch `.github/workflows/deploy-production.yml` execute
5. Verify production is working

---

## Migration-Specific Safety Checks

Add pre-deployment validation in your workflow:

```yaml
- name: Validate migrations
  run: |
    echo "Checking for breaking changes in migrations..."
    
    # List pending migrations
    npx prisma migrate status
    
    # Verify migration files are valid SQL
    for file in prisma/migrations/*/migration.sql; do
      if ! grep -q "ALTER TABLE\|CREATE TABLE\|DROP TABLE" "$file"; then
        echo "⚠️  Migration may be empty: $file"
      fi
    done
```

---

## Monitoring Post-Deployment

### Health Check Endpoint
Ensure your app has a health check endpoint:

```typescript
// app/api/health/route.ts
export async function GET() {
  try {
    // Test database connection
    const result = await db.vendor.findFirst();
    
    return Response.json({
      status: 'healthy',
      database: 'connected',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return Response.json(
      { status: 'unhealthy', error: error.message },
      { status: 500 }
    );
  }
}
```

### Add to deployment workflow:
```yaml
- name: Wait for app to be ready
  run: |
    for i in {1..30}; do
      if curl -f https://your-prod.com/api/health; then
        echo "App is ready!"
        exit 0
      fi
      echo "Waiting for app... ($i/30)"
      sleep 2
    done
    echo "App failed to start"
    exit 1
```

---

## Environment Variables for Production Build

Ensure these are set on production server:

```bash
# .env.production
NODE_ENV=production
DATABASE_URL=postgresql://user:pass@prod-db:5432/hms
DIRECT_URL=postgresql://user:pass@prod-db:5432/hms
JWT_SECRET=your-secure-secret-key
JWT_REFRESH_SECRET=your-secure-refresh-key
NEXTAUTH_URL=https://your-prod-domain.com
```

---

## Verification Checklist

After successful deployment:

- [ ] Health check endpoint returns 200
- [ ] Database migrations applied successfully
- [ ] Purchase Order API endpoints respond
- [ ] Vendor CRUD operations work
- [ ] New KRA PIN and eTIMS fields accessible
- [ ] No 500 errors in application logs
- [ ] Previous functionality still works (no regression)

---

## Rollback Checklist

If something goes wrong:

- [ ] Stop application: `pm2 stop ecosystem.config.js`
- [ ] Restore database backup: `psql < db-backup-XXXXXX.sql`
- [ ] Revert git commit: `git revert HEAD`
- [ ] Rebuild and restart: `npm run build && pm2 restart ecosystem.config.js`
- [ ] Verify health check: `curl https://your-prod.com/api/health`
- [ ] Notify team on Slack

---

## Cost & Performance Considerations

- **Deployment frequency:** ~5 min per deploy (build + migrations + restart)
- **Downtime:** ~30 seconds (PM2 restart with 0-downtime strategy)
- **Database backups:** Store 7 days of backups (~100MB each)
- **GitHub Actions:** Free tier includes 2,000 minutes/month

---

## Next: Implement Automatically Synchronized Production Database

Once this workflow is in place, your database WILL sync automatically:

```
Developer commits schema change
         ↓
Git push to main
         ↓
CI tests validate (Unit + Integration)
         ↓
GitHub Actions triggers deployment workflow
         ↓
SSH into production, pull code, run migrations
         ↓
Application restarts with new schema
         ↓
Slack notification sent
```

**Timeline:** ~10 minutes from commit to production

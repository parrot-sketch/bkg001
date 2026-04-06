# Pre-Production Deployment Checklist

Use this checklist to verify everything is ready before deploying to production.

---

## Phase 1: SSH Keys & Server Access (30 minutes)

### Generate SSH Keys
- [ ] Generated RSA SSH key pair: `ssh-keygen -t rsa -b 4096 -f ~/.ssh/github_actions_deploy -N ""`
- [ ] Private key saved: `~/.ssh/github_actions_deploy`
- [ ] Public key saved: `~/.ssh/github_actions_deploy.pub`
- [ ] Verified key contents (no corrupted files)

### Configure Production Server
- [ ] SSH access working: `ssh -i ~/.ssh/github_actions_deploy deploy-user@your-prod-server.com`
- [ ] Created `deploy-user` account on production server
- [ ] Added SSH public key to `~/.ssh/authorized_keys`
- [ ] SSH permissions correct: `chmod 700 ~/.ssh && chmod 600 ~/.ssh/authorized_keys`
- [ ] Created `/app/fullstack-healthcare` directory
- [ ] Created `/backups` directory
- [ ] Directories owned by deploy-user: `chown -R deploy-user:deploy-user /app /backups`

### Setup PM2
- [ ] PM2 installed globally: `sudo npm install -g pm2`
- [ ] PM2 startup configured: `sudo pm2 startup`
- [ ] `ecosystem.config.js` created on server
- [ ] PM2 can start app: `pm2 start ecosystem.config.js`
- [ ] Application restarts on reboot: `sudo pm2 save`

---

## Phase 2: GitHub Configuration (20 minutes)

### Repository Structure
- [ ] `.github/workflows/deploy-production.yml` exists and is valid YAML
- [ ] `.github/workflows/deploy-staging.yml` exists and is valid YAML
- [ ] `/app/api/health/route.ts` exists and is deployed to main
- [ ] All files committed and pushed to main branch

### GitHub Secrets Configuration
- [ ] Navigated to: Settings > Secrets and variables > Actions
- [ ] Created secrets:
  - [ ] `PROD_SSH_PRIVATE_KEY` - Contents of `~/.ssh/github_actions_deploy`
  - [ ] `PROD_SSH_USER` - Set to `deploy-user`
  - [ ] `PROD_SERVER_HOST` - Set to your production server hostname
  - [ ] `PROD_APP_PATH` - Set to `/app/fullstack-healthcare`
  - [ ] `PROD_DB_HOST` - PostgreSQL hostname
  - [ ] `PROD_DB_USER` - Database username
  - [ ] `PROD_DB_PASSWORD` - Database password
  - [ ] `PROD_DB_NAME` - Database name (e.g., `healthcare`)
  - [ ] `STAGING_SSH_PRIVATE_KEY` - SSH private key for staging
  - [ ] `STAGING_SSH_USER` - Staging deploy user
  - [ ] `STAGING_SERVER_HOST` - Staging server hostname
  - [ ] `STAGING_APP_PATH` - Staging app path
- [ ] Optional: `SLACK_WEBHOOK` - Slack notification webhook URL

### Environment Protection
- [ ] Created GitHub environment: `production`
  - [ ] Deployment branches: `Protected branches only` + `main`
  - [ ] Optional: Added required reviewers for approval
- [ ] Created GitHub environment: `staging`
  - [ ] Deployment branches: `Protected branches only` + `develop`
  - [ ] No required reviewers (auto-deploy when develop changes)

### GitHub Actions Enabled
- [ ] Settings > Actions > General > Allow all actions enabled
- [ ] Workflows are visible in Actions tab
- [ ] Deploy workflows show as ready to run

---

## Phase 3: Database Configuration (15 minutes)

### Database Setup
- [ ] PostgreSQL database created: `healthcare`
- [ ] Database user created with proper permissions
- [ ] Database password is secure (min 20 characters)
- [ ] Database is reachable from app server
- [ ] Test connection succeeds: `psql -h db.example.com -U db_user -d healthcare -c "SELECT 1"`

### Backups
- [ ] Backup directory exists: `/backups` on production server
- [ ] Backup directory writable by deploy-user
- [ ] Disk space available for backups (at least 100GB recommended)
- [ ] Manual backup test succeeded

### Prisma
- [ ] `prisma/schema.prisma` is up to date
- [ ] All migrations are in `prisma/migrations/`
- [ ] Migration SQL files are valid: `npx prisma migrate status`
- [ ] Prisma client generated: `npx prisma generate`

---

## Phase 4: Application Readiness (20 minutes)

### Code Quality
- [ ] No TypeScript errors: `npx tsc --noEmit` passes
- [ ] Build succeeds locally: `npm run build`
- [ ] Linting passes: `npm run lint` (if configured)
- [ ] Tests pass: `npm test` (if configured)
- [ ] Health endpoint implemented: `/app/api/health/route.ts`

### Environment Variables
- [ ] `.env.production` configured on production server
- [ ] All required variables set:
  - [ ] `NODE_ENV=production`
  - [ ] `DATABASE_URL` configured
  - [ ] `NEXTAUTH_URL` set to production domain
  - [ ] `NEXTAUTH_SECRET` configured
  - [ ] `PORT=3000`
- [ ] `.env` file NOT committed to git (in `.gitignore`)

### Deployment Files
- [ ] `ecosystem.config.js` on production server
- [ ] `.github/workflows/deploy-production.yml` syntactically valid
- [ ] `.github/workflows/deploy-staging.yml` syntactically valid
- [ ] Health check endpoint responds: `http://localhost:3000/api/health`

---

## Phase 5: Testing (45 minutes)

### Pre-Deployment Checklist
- [ ] Run locally and verify working:
  ```bash
  npm run build
  npm start
  curl http://localhost:3000/api/health
  ```

### Staging Deployment Test
- [ ] Create test branch from develop
- [ ] Make small change (e.g., add comment to README)
- [ ] Push to develop branch
- [ ] Watch workflow execute in Actions tab
- [ ] Verify success:
  - [ ] Workflow completed without errors
  - [ ] App deployed to staging
  - [ ] Health check returns 200
  - [ ] Slack notification received (if configured)
- [ ] SSH to staging and verify:
  ```bash
  pm2 list
  pm2 logs | head -20
  curl http://localhost:3000/api/health
  ```

### Production Dry Run
- [ ] Merge develop to main (triggers production workflow)
- [ ] Review workflow execution:
  - [ ] Pre-deployment checks passed
  - [ ] Database backup completed
  - [ ] Migrations ran successfully
  - [ ] App built without errors
  - [ ] Health check passed
  - [ ] Slack notification sent
- [ ] SSH to production and verify:
  ```bash
  pm2 status
  pm2 logs healthcare-app-prod | head -20
  curl http://localhost:3000/api/health
  ```

### Feature Verification
- [ ] Every feature from main branch is working
- [ ] No 404 or 500 errors on key endpoints
- [ ] Database connectivity verified
- [ ] All API endpoints responding

---

## Phase 6: Monitoring & Documentation (15 minutes)

### Monitoring Setup
- [ ] Slack webhook configured (optional)
- [ ] Test notification:
  ```bash
  curl -X POST $SLACK_WEBHOOK \
    -H 'Content-type: application/json' \
    -d '{"text":"Test notification"}'
  ```
- [ ] Monitoring dashboard setup (if using external service)
- [ ] Alert rules configured

### Documentation
- [ ] Team has access to [PRODUCTION_DEPLOYMENT_SETUP.md](PRODUCTION_DEPLOYMENT_SETUP.md)
- [ ] Team has access to [PRODUCTION_OPERATIONS_RUNBOOK.md](PRODUCTION_OPERATIONS_RUNBOOK.md)
- [ ] Team has access to [DEPLOYMENT_TROUBLESHOOTING.md](DEPLOYMENT_TROUBLESHOOTING.md)
- [ ] Emergency contacts documented
- [ ] On-call rotation established

### Team Training
- [ ] Team read and understands all deployment docs
- [ ] Team knows how to access server: `ssh deploy-user@your-prod-server.com`
- [ ] Team knows how to check status: `pm2 list`
- [ ] Team knows how to view logs: `pm2 logs healthcare-app-prod`
- [ ] Team knows how to rollback manually
- [ ] Team knows who to contact in emergencies

---

## Final Verification

### Security Checklist
- [ ] SSH keys are secure (not committed to git)
- [ ] GitHub secrets are encrypted
- [ ] Database password is strong
- [ ] No credentials in `.env` files
- [ ] SSH key cleanup runs after deployment
- [ ] Minimum required permissions granted to deploy-user

### Infrastructure Checklist
- [ ] Production server is configured for high availability
- [ ] Database has automated backups (external to app server)
- [ ] Disk space monitored (alerts set)
- [ ] Network connectivity is reliable
- [ ] SSL/TLS certificate configured for HTTPS

### Operational Readiness
- [ ] On-call team trained and equipped
- [ ] Runbook printed/accessible
- [ ] Rollback procedure tested
- [ ] Incident response plan documented
- [ ] Post-incident review process established

---

## Go/No-Go Decision Matrix

| Component | Status | Blocker? |
|-----------|--------|----------|
| SSH connectivity | ✅ Working | ❌ No |
| GitHub secrets | ✅ Configured | ❌ No |
| Database | ✅ Ready | ✅ **YES** - Must work |
| Application build | ✅ Passes | ✅ **YES** - Must pass |
| Health endpoint | ✅ Responds | ✅ **YES** - Must respond |
| Staging deployment | ✅ Successful | ❌ No (warning if fails) |
| Team trained | ✅ Complete | ❌ No |
| Monitoring ready | ✅ Configured | ❌ No |

**GO to Production if:**
- ✅ All items in Phases 1-5 checked
- ✅ All blockers resolved
- ✅ Team confident in procedures
- ✅ Management approval received

**NO-GO if:**
- ❌ Database not accessible
- ❌ Application won't build
- ❌ Health endpoint unreachable
- ❌ SSH key doesn't work
- ❌ Team inadequately trained

---

## First Production Deployment Checklist

On the day of first production deployment:

```bash
# 1. Final verification on production server
ssh deploy-user@your-prod-server.com
pm2 list          # Should show app running or "no processes"
df -h /           # Verify disk space
free -h           # Verify memory available

# 2. Verify backups exist
ls -lah /backups/

# 3. Test database connection one more time
psql -h $PROD_DB_HOST -U $PROD_DB_USER -d healthcare -c "SELECT COUNT(*) FROM \"User\";"

# 4. Merge to main branch (DEPLOY!)
git checkout main
git pull
# Create PR from develop, get approval, merge

# 5. Watch workflow
# GitHub > Actions tab > Watch deploy-production.yml execute

# 6. Verify production is healthy
# Wait for health check to pass
# Receive Slack notification
# SSH and check: pm2 list, pm2 logs

# 7. Announce to team
# Post in Slack: "Production deployment successful! v0.1.0 now live"
```

---

## Post-Deployment (First 24 Hours)

- [ ] Monitor app logs for errors: `pm2 logs | head -100`
- [ ] Check health endpoint: `curl https://your-prod-domain.com/api/health`
- [ ] Verify all features working
- [ ] Check database query performance
- [ ] Review Slack notifications
- [ ] No user reports of issues
- [ ] Write post-deployment summary

---

## Troubleshooting During Deployment

If something goes wrong, see: [DEPLOYMENT_TROUBLESHOOTING.md](DEPLOYMENT_TROUBLESHOOTING.md)

Common issues:
- SSH connection failed → Check GitHub secrets
- Workflow didn't trigger → Check branch protection rules
- Health check timeout → Check app logs with `pm2 logs`
- Migration failed → Manually resolve with `npx prisma migrate resolve`

---

**Print this checklist and use it for your first deployment!**

**Last Updated:** 2026-04-06
**Created By:** DevOps Team
**Review Frequency:** Before each production deployment

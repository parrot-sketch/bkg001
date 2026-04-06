# Quick Reference Card: Deployment Commands

Print this page or bookmark it for quick access to common commands.

---

## Most Common Commands

### Check Status
```bash
# SSH into production
ssh deploy-user@your-prod-server.com

# Check if app is running
pm2 list

# See last 20 lines of logs
pm2 logs healthcare-app-prod | tail -20

# Health of the app
curl http://localhost:3000/api/health
```

### If Something is Broken
```bash
# 1. Restart the app
pm2 restart healthcare-app-prod

# 2. Check the error
pm2 logs healthcare-app-prod --err | tail -50

# 3. If still broken, revert code
git reset --hard HEAD~1
npm run build
pm2 restart healthcare-app-prod

# 4. Restore from backup if database issue
PGPASSWORD='pass' pg_restore \
  -h db.host -U db_user -d healthcare \
  /backups/db-backup-LATEST.sql
```

### View Deployment History
```bash
# See what was deployed
cd /app/fullstack-healthcare
git log --oneline -10

# See deployment logs
pm2 logs | grep -i "restarted\|started"

# Check backups
ls -lah /backups/
```

---

## GitHub Actions

### Trigger Deployment on Main
```bash
# On your laptop:
git checkout main
git pull origin main
# Make changes
git commit -am "message"
git push origin main

# Then watch it deploy:
# Go to GitHub.com > Actions tab > Watch deploy-production.yml run
```

### Trigger Staging Deployment on Develop
```bash
git checkout develop
git pull origin develop
# Make changes
git commit -am "test"
git push origin develop

# Watch: Actions tab > deploy-staging.yml
```

### Manual Trigger (without code change)
```
GitHub.com > Actions > deploy-production > Run workflow > Run workflow
```

### Check Workflow Status
1. Go to: **GitHub.com > Your Repo > Actions tab**
2. Click on workflow name
3. View logs for each step
4. Expand failed steps to see error details

---

## Database Commands

### Backup Database
```bash
ssh deploy-user@your-prod-server.com

# Manual backup
PGPASSWORD='password' pg_dump \
  -h db.example.com \
  -U db_user \
  -d healthcare \
  > /backups/backup-$(date +%Y%m%d-%H%M%S).sql
```

### Check Migrations
```bash
cd /app/fullstack-healthcare
npx prisma migrate status

# If migration is stuck:
npx prisma migrate resolve --rolled-back MIGRATION_NAME
```

### Verify Database Connection
```bash
psql -h db.example.com -U db_user -d healthcare -c "SELECT 1"
# Should respond: 1
```

### Count Records
```bash
psql -h db.example.com -U db_user -d healthcare \
  -c "SELECT COUNT(*) FROM \"User\";"
```

---

## Application Control

### Start / Stop / Restart
```bash
ssh deploy-user@your-prod-server.com

# Start
pm2 start ecosystem.config.js

# Stop (graceful)
pm2 stop healthcare-app-prod

# Restart
pm2 restart healthcare-app-prod

# Kill and restart (hard reset)
pm2 kill
pm2 start ecosystem.config.js
```

### Scale to More Cores
```bash
pm2 scale healthcare-app-prod 4  # Run 4 instances
```

### Monitor Memory/CPU
```bash
pm2 monit  # Interactive monitor (watch memory grow etc)
```

### View Real-Time Logs
```bash
pm2 logs healthcare-app-prod

# Only errors
pm2 logs healthcare-app-prod --err

# Last 100 lines
pm2 logs healthcare-app-prod --lines 100

# Grep for pattern
pm2 logs healthcare-app-prod | grep "ERROR"
```

---

## Troubleshooting Shortcuts

### App Won't Start
```bash
pm2 logs healthcare-app-prod --err | head -20
# Read the error message
# Common: Database connection, missing env variables, port in use

# Check port is free
lsof -i :3000
```

### Database Connection Error
```bash
# Test connection
psql -h $PROD_DB_HOST -U $PROD_DB_USER -d healthcare -c "SELECT 1"

# Check environment in app
env | grep DATABASE
```

### High CPU/Memory
```bash
# Check what's using it
top -b -n 1 | head -20

# Scale down instances if needed
pm2 scale healthcare-app-prod 1

# Monitor
watch -n 1 'pm2 list'
```

### Deployment Failed
```bash
# Check what went wrong
# GitHub Actions > Failed workflow > View logs

# Common issues:
# 1. SSH key problem → Check PROD_SSH_PRIVATE_KEY secret
# 2. Migration error → Check migration SQL syntax
# 3. Build error → Check npm run build locally
# 4. Health check timeout → Check app started (pm2 logs)
```

### Lost Connection to Server
```bash
# Verify SSH key works
ssh -i ~/.ssh/github_actions_deploy deploy-user@your-prod-server.com ls

# If failed, add key to ssh-agent
ssh-add ~/.ssh/github_actions_deploy
ssh deploy-user@your-prod-server.com ls
```

---

## System Checks

### Disk Space
```bash
df -h
# Should have 10GB+ free on /

# Check backups aren't filling disk
du -sh /backups/
```

### Free Memory
```bash
free -h
# Should have 50%+ free

# If low, restart app
pm2 kill
pm2 start ecosystem.config.js
```

### Network Connectivity
```bash
ping your-prod-server.com
ping db.example.com
curl -I https://your-prod-domain.com/api/health
```

### Recent Changes
```bash
cd /app/fullstack-healthcare

# See last deployments
git log --oneline -5

# See what files changed
git diff HEAD~1 HEAD

# See status
git status
```

---

## Key Secrets (Reference Only)

These are stored in GitHub. Never put actual values in code:

- `PROD_SSH_PRIVATE_KEY` - Private SSH key (secret!)
- `PROD_SERVER_HOST` - Production server hostname
- `PROD_DB_HOST` - Database hostname
- `PROD_DB_USER` - Database username
- `PROD_DB_PASSWORD` - Database password
- `PROD_DB_NAME` - Database name
- `SLACK_WEBHOOK` - Slack webhook URL (if using notifications)

To view/update secrets:
1. GitHub.com > Your Repo > Settings > Secrets and variables > Actions
2. Click secret name to update
3. Cannot view secret values (encrypted)

---

## One-Liner Diagnostics

```bash
# Check everything in 10 seconds
ssh deploy-user@your-prod-server.com << 'EOF'
echo "=== APP STATUS ==="; pm2 list; \
echo "=== DISK SPACE ==="; df -h /; \
echo "=== MEMORY ==="; free -h; \
echo "=== RECENT LOGS ==="; pm2 logs healthcare-app-prod | tail -5; \
echo "=== DATABASE ==="; psql -h $PROD_DB_HOST -U $PROD_DB_USER -d healthcare -c "SELECT 1"
EOF
```

## Emergency Contacts

```
Level 1 Issue (App down):
  - Check: pm2 list, pm2 logs
  - Restart: pm2 restart healthcare-app-prod
  - Contact: @devops-team on Slack

Level 2 Issue (Database down):
  - Check: psql connection
  - Contact: Database team

Level 3 Issue (Can't SSH):
  - Contact: Infrastructure lead
  - Have: SSH key backup, server IP
```

---

## Before You Deploy

- [ ] Test locally: `npm run build && npm start`
- [ ] Health endpoint works: `curl localhost:3000/api/health`
- [ ] Deploy to staging first (develop branch)
- [ ] Wait for staging to succeed
- [ ] Code review completed
- [ ] Team knows you're deploying

---

## After You Deploy

- [ ] Check workflow succeeded in GitHub Actions tab
- [ ] Verify app is healthy: `curl https://your-prod-domain.com/api/health`
- [ ] SSH and check logs: `pm2 logs | tail -20`
- [ ] Test key features in production
- [ ] Slack notified team (if configured)
- [ ] No errors in logs after 5 minutes = success

---

## Copy-Paste Commands

**Quick status check:**
```bash
ssh deploy-user@your-prod-server.com "pm2 list && pm2 logs healthcare-app-prod | tail -10"
```

**Restart and watch logs:**
```bash
ssh deploy-user@your-prod-server.com "pm2 restart healthcare-app-prod && sleep 2 && pm2 logs healthcare-app-prod | tail -50"
```

**Full diagnostic:**
```bash
ssh deploy-user@your-prod-server.com << 'CMD'
echo "Status:" && pm2 list && \
echo -e "\nRecent Logs:" && pm2 logs healthcare-app-prod --lines 30 && \
echo -e "\nSystem:" && df -h / && free -h
CMD
```

**Check if deployment is running:**
```bash
cd /app/fullstack-healthcare && git log --oneline -1 && echo "From branch:" && git branch -v
```

---

## Cheat Sheet Bookmarks

Save these URLs:
- **GitHub Actions:** https://github.com/YOUR_ORG/fullstack-healthcare/actions
- **Production App:** https://your-prod-domain.com/api/health
- **GitHub Secrets:** https://github.com/YOUR_ORG/fullstack-healthcare/settings/secrets/actions
- **Database PgAdmin:** https://pgadmin.example.com (if you use this)

---

## Quick Decision Tree

```
🤔 Is the app working?
├─ YES → Nothing to do! Check logs occasionally
└─ NO → Is it responding to health check?
    ├─ YES → Issue with specific feature, check app logs
    ├─ NO → App crashed
    │   ├─ Restart: pm2 restart healthcare-app-prod
    │   ├─ Still down? Check logs: pm2 logs --err
    │   └─ Still down? Rollback last deployment
    └─ Can't SSH? Check network, SSH key

🚀 Ready to deploy?
├─ YES → Push to main (or merge PR)
├─ NO → Deploy to develop (staging) first
└─ Testing → Merge develop to main once staging passes

💥 Everything is broken!
├─ Step 1: Calm down, take a screenshot of error
├─ Step 2: Check logs: pm2 logs --err
├─ Step 3: Restart app: pm2 restart healthcare-app-prod
├─ Step 4: Still broken? Rollback last code change
└─ Step 5: Contact team, provide logs + screenshot
```

---

**Keep this page bookmarked or printed at your desk!**

**Last Updated:** 2026-04-06
**For:** Production Ops Team

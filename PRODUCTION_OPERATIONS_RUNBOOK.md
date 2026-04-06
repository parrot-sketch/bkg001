# Production Operations Runbook

## Overview

This runbook is for the operations and deployment team managing the production healthcare application.

**Quick Reference:**
- **App URL:** https://your-production-domain.com
- **Health Check:** https://your-production-domain.com/api/health
- **Monitoring:** Check alerts in Slack
- **SSH Access:** `ssh deploy-user@your-prod-server.com`
- **Process Manager:** PM2 (run as deploy-user)

---

## Table of Contents

1. Daily Health Checks
2. Common Operations
3. Incident Response
4. Database Operations
5. Log Analysis
6. Performance Tuning

---

## 1. Daily Health Checks

### Morning Checklist

```bash
# Login to production server
ssh deploy-user@your-prod-server.com

# 1. Check app status
pm2 list

# Expected output:
# id │ name                    │ namespace   │ version  │ mode    │ pid      │ uptime │ ↺  │ status  │
# 0  │ healthcare-app-prod     │ default     │ 0.1.0    │ cluster │ 1234     │ 10h    │ 0  │ online  │

# 2. Check app is responding
curl http://localhost:3000/api/health

# Expected: 200 OK with healthy status

# 3. Check disk space
df -h | grep -E "^/dev|mounted on"

# Expected: At least 10GB free on /

# 4. Check memory usage
free -h

# Expected: At least 50% memory free

# 5. Check database connectivity
# (From app server)
psql -h db.example.com -U db_user -d healthcare -c "SELECT 1"

# Expected: Response code 1
```

### Weekly Deep Dive

```bash
# 1. Review system logs for errors
sudo journalctl -p err -n 50

# 2. Check deployment history
cd /app/fullstack-healthcare
git log --oneline -10

# 3. Verify backups exist
ls -lah /backups/ | head -10

# Expected: Recent backups from last deployment

# 4. Check disk usage of database backups
du -sh /backups/

# Expected: < 50GB (depends on your DB size)

# 5. View application metrics
pm2 logs healthcare-app-prod | tail -100 | grep -i "warn\|error"
```

---

## 2. Common Operations

### Start/Stop Application

```bash
# Start application
pm2 start ecosystem.config.js

# Stop application (graceful)
pm2 stop healthcare-app-prod

# Restart application
pm2 restart healthcare-app-prod

# Restart with env variables reloaded
pm2 restart ecosystem.config.js --env production

# Kill and restart (hard restart)
pm2 kill
pm2 start ecosystem.config.js
```

### View Logs

```bash
# Real-time logs
pm2 logs healthcare-app-prod

# Last 100 lines
pm2 logs healthcare-app-prod --lines 100

# Only errors
pm2 logs healthcare-app-prod --err | tail -20

# Specific time range
pm2 logs healthcare-app-prod | grep "2026-04"
```

### Scale Application

```bash
# View current cluster mode
pm2 list

# Configure instances in ecosystem.config.js:
# instances: 'max'  (uses all CPU cores)
# Then restart:
pm2 restart ecosystem.config.js

# Manually set instances
pm2 scale healthcare-app-prod 4
```

---

## 3. Incident Response

### App Not Responding

```bash
# 1. Check if process is running
pm2 list

# If status is "stopped" or "errored":
pm2 restart healthcare-app-prod

# 2. Check logs immediately
pm2 logs healthcare-app-prod --err | tail -50

# 3. Check system resources
top -b -n 1 | head -20
free -h

# 4. If high memory usage:
pm2 kill  # Force kill all processes
pm2 start ecosystem.config.js

# 5. If won't start, check for port conflicts
sudo lsof -i :3000

# 6. Notify team and check GitHub for recent deployments
cd /app/fullstack-healthcare
git log --oneline -5
```

### Database Connection Error

```bash
# 1. Test database connectivity
psql -h db.example.com -U db_user -d healthcare -c "SELECT 1"

# 2. Check if database is running
# (Contact database team if hosted externally)

# 3. Verify environment variables
printenv | grep DATABASE_URL

# 4. Restart app to refresh connection pool
pm2 restart healthcare-app-prod

# 5. If still failing, check migrations:
npx prisma migrate status
```

### High CPU Usage

```bash
# 1. Identify what's consuming CPU
top -b -n 1

# 2. Check application logs for runaway queries
pm2 logs healthcare-app-prod | grep -i "query\|select"

# 3. If database query is slow:
ssh postgres-admin@db.example.com
SELECT * FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 5;

# 4. Reduce PM2 instances to lower CPU load
pm2 scale healthcare-app-prod 2

# 5. Restart and monitor
pm2 restart healthcare-app-prod
pm2 logs healthcare-app-prod
```

### Out of Memory

```bash
# 1. Check memory usage
free -h
vm_stat  # macOS

# 2. Check PM2 process memory
pm2 monit  # Interactive monitor

# 3. Increase memory limit in ecosystem.config.js:
# max_memory_restart: '500M'

# 4. Restart app
pm2 restart ecosystem.config.js

# 5. If not enough, need to upgrade server RAM
# Contact infrastructure team
```

### Stuck Database Migration

```bash
# 1. Check migration status
cd /app/fullstack-healthcare
npx prisma migrate status

# 2. If migration is "pending":
# It means it was started but never completed

# 3. Check for active queries blocking migration
# (From database admin account)
SELECT * FROM pg_stat_activity WHERE state = 'active';

# 4. Kill blocking connections if needed:
SELECT pg_terminate_backend(pid) FROM pg_stat_activity 
  WHERE pid <> pg_backend_pid() AND query LIKE '%migration%';

# 5. Retry migration
npx prisma migrate deploy

# 6. If still stuck, manual recovery:
npx prisma migrate resolve --rolled-back <MIGRATION_NAME>
```

---

## 4. Database Operations

### Create Manual Backup

```bash
# Full database backup
PGPASSWORD=your_db_password pg_dump \
  -h db.example.com \
  -U db_user \
  -d healthcare \
  --format=custom \
  > /backups/manual-backup-$(date +%Y%m%d-%H%M%S).dump

# Verify backup
ls -lah /backups/manual-backup-*
```

### Restore from Backup

**CRITICAL: Test restore in non-production environment first!**

```bash
# List available backups
ls -lah /backups/ | grep db-backup

# Restore (this will REPLACE current data)
PGPASSWORD=your_db_password pg_restore \
  -h db.example.com \
  -U db_user \
  -d healthcare \
  -c \  # Clean before restore
  /backups/db-backup-20260406-143022.sql

# Verify restore
psql -h db.example.com -U db_user -d healthcare -c "SELECT COUNT(*) FROM \"User\";"
```

### Run Migrations Manually

```bash
cd /app/fullstack-healthcare

# Check migration status
npx prisma migrate status

# Run pending migrations
npx prisma migrate deploy

# If migration is stuck, resolve it:
npx prisma migrate resolve --rolled-back <MIGRATION_NAME>

# Verify schema after migration
npx prisma db pull

# Check what changed
git diff prisma/schema.prisma
```

---

## 5. Log Analysis

### Find Errors by Time

```bash
# 1 hour of logs
pm2 logs healthcare-app-prod | tail -500

# Errors only
pm2 logs healthcare-app-prod --err | head -50

# Grep for specific error
pm2 logs healthcare-app-prod | grep "ConflictError"
```

### Performance Analysis

```bash
# Look for slow requests
pm2 logs healthcare-app-prod | grep -i "duration.*ms.*[5-9][0-9][0-9]"

# Count API calls by endpoint
pm2 logs healthcare-app-prod | grep "GET\|POST\|PUT\|DELETE" | cut -d' ' -f2 | sort | uniq -c

# Find memory leaks (usage increasing over time)
pm2 monit
# Watch memory grow over time, if it keeps increasing = leak
```

### Log Format Understanding

Expected log format from Next.js app:

```
[API] GET /api/stores/vendors 200 42ms
[API] POST /api/purchase-orders 201 156ms
[ERROR] Database connection failed: ECONNREFUSED
[WARN] Slow query detected: SELECT * FROM PurchaseOrder (523ms)
```

---

## 6. Performance Tuning

### Optimize Database Connections

```bash
# Check current pool size
env | grep DATABASE_URL

# In ecosystem.config.js, add:
# env: {
#   DATABASE_POOL_SIZE: '20',
#   DATABASE_MAX_OVERFLOW: '10',
# }

pm2 restart ecosystem.config.js
```

### Enable Request Compression

```bash
# In Next.js app, add compression middleware:
# app.use(compression())

# Rebuild and restart
npm run build
pm2 restart healthcare-app-prod
```

### CDN Caching Headers

```bash
# Verify caching headers being sent
curl -i https://your-production-domain.com/api/health | grep -i "cache-control"

# Should return appropriate cache headers
```

---

## Emergency Contacts

```
Infrastructure Team:
  Phone: +254-XXXX-XXXX
  Slack: @infrastructure

Database Team:
  Phone: +254-XXXX-XXXX
  Slack: @database-admins

On-Call Rotation:
  Monday-Friday 9am-5pm: DevOps Team
  After Hours: Senior SRE (check on-call schedule)
```

---

## Deployment History

To see what was deployed and when:

```bash
# Recent deployments
cd /app/fullstack-healthcare
git log --oneline -20

# See deployment logs
cat /app/fullstack-healthcare/deployment.log

# See PM2 restart history
pm2 save
pm2 logs healthcare-app-prod --lines 1000 | grep -i "restart\|stopped\|started"
```

---

## Quick Reference Commands

```bash
# Status check (fastest way to see health)
pm2 status

# Restart gracefully
pm2 restart healthcare-app-prod

# Emergency stop
pm2 stop healthcare-app-prod

# View detailed logs
pm2 logs healthcare-app-prod

# Check backups exist
ls -lah /backups/

# Test database
psql -h db.example.com -U db_user -d healthcare -c "SELECT 1"

# Check disk space
df -h /

# See recent git commits
cd /app/fullstack-healthcare && git log --oneline -5
```

---

## Most Common Issues & Solutions

| Issue | Symptoms | Solution |
|-------|----------|----------|
| App won't start | PM2 status shows "errored" | `pm2 restart healthcare-app-prod`, check logs with `pm2 logs --err` |
| Database connection error | Errors about ECONNREFUSED | Check if DB is running, verify DATABASE_URL, restart app |
| Out of memory | Process crashes repeatedly | Increase max_memory_restart in ecosystem.config.js, upgrade server RAM |
| Slow API responses | Requests taking 5+ seconds | Check database query performance, scale up PM2 instances |
| Deployment failed | Rollback was automatic | Check `/backups/` for recovery, see git log for previous version |
| High CPU usage | Load average > number of cores | Check for runaway queries, reduce PM2 instances |
| Stuck migration | `npx prisma migrate status` shows pending | Check postgres for blocking connections, manually resolve |

---

**Last Updated:** 2026-04-06
**Maintained By:** DevOps Team
**Review Frequency:** Quarterly

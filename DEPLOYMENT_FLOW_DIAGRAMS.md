# Deployment Flow Diagrams & Decision Guide

## Main Deployment Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    Developer Workflow                        │
│                                                              │
│  1. Make code changes locally                               │
│  2. Test locally: npm run build && npm start                │
│  3. Commit: git commit -am "feature: xxx"                   │
│  4. Push to feature branch: git push origin feature-xxx     │
│  5. Create PR on GitHub                                     │
│  6. Request review from team                                │
│  7. ✅ Approved by reviewer                                 │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│                 Staging Deployment (TESTING)                │
│                                                              │
│  1. Merge PR to 'develop' branch                            │
│     git checkout develop && git pull                        │
│     git merge --ff-only origin/feature-xxx                  │
│     git push origin develop                                 │
│                                                              │
│  2. GitHub Actions triggers automatically:                  │
│     .github/workflows/deploy-staging.yml                    │
│                                                              │
│  3. Deployment steps:                                       │
│     ✓ Pre-deployment validation                            │
│     ✓ SSH to staging server                                │
│     ✓ Create database backup                               │
│     ✓ Pull latest code                                     │
│     ✓ Install dependencies                                 │
│     ✓ Run migrations                                       │
│     ✓ Build application                                    │
│     ✓ Restart with PM2                                     │
│     ✓ Health check verification                            │
│     ✓ Smoke tests                                          │
│     ✓ Slack notification                                   │
│                                                              │
│  4. Team verifies on staging:                              │
│     curl https://staging.your-domain.com/api/health        │
│     - Test new features                                    │
│     - Verify database migrations worked                    │
│     - Check for any errors in logs                         │
│                                                              │
│  5. ✅ STAGING TESTS PASS                                   │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│          Production Deployment (THE REAL THING)             │
│                                                              │
│  1. Merge 'develop' to 'main' branch:                      │
│     git checkout main && git pull                          │
│     git merge --ff-only origin/develop                     │
│     git push origin main                                   │
│                                                              │
│  2. GitHub Actions triggers deploy-production.yml:         │
│                                                              │
│  3. ⚠️  If using approval gates:                           │
│     - Review > Actions tab                                 │
│     - Approve deployment                                   │
│     - Workflow continues to deploy                         │
│                                                              │
│  4. Deployment steps:                                       │
│     ✓ Pre-deployment validation                            │
│     ✓ SSH to production server                             │
│     ✓ CREATE DATABASE BACKUP (CRITICAL!)                   │
│     ✓ Pull latest code from main                           │
│     ✓ Install dependencies                                 │
│     ✓ Generate Prisma client                               │
│     ✓ Run migrations (FATAL if fails)                      │
│     ✓ Build Next.js application                            │
│     ✓ Restart with PM2 (0-downtime)                        │
│     ✓ Health check (30 attempts, 60s timeout)              │
│     ✓ Smoke tests                                          │
│     ✓ Slack notification (SUCCESS!)                        │
│     ✓ SSH key cleanup (security)                           │
│                                                              │
│  5. Monitor production:                                     │
│     - Check Slack notification (✅ SUCCESS or ❌ FAILURE)   │
│     - Verify: curl https://your-prod-domain.com/api/health │
│     - SSH check: pm2 logs healthcare-app-prod              │
│     - Test key features                                    │
│     - Monitor logs for 30 minutes                          │
│                                                              │
│  ✅ PRODUCTION DEPLOYMENT COMPLETE                         │
└─────────────────────────────────────────────────────────────┘
```

---

## What Happens If Deployment Fails?

```
Deployment Running
       │
       ├─ Pre-checks fail?
       │  └─ STOP: Fix locally and retry
       │
       ├─ Database backup fails?
       │  └─ ROLLBACK: Abort, try again
       │     (Backup is CRITICAL)
       │
       ├─ Database migration fails?
       │  └─ AUTOMATIC ROLLBACK:
       │     • Revert git commit
       │     • Rebuild old code
       │     • Restart app
       │     • Notify Slack
       │     ⟹ Team must investigate manually
       │
       ├─ Build fails?
       │  └─ AUTOMATIC ROLLBACK: Revert code
       │
       ├─ App doesn't start?
       │  └─ AUTOMATIC ROLLBACK: Revert code
       │
       ├─ Health check timeout?
       │  └─ AUTOMATIC ROLLBACK: Revert code
       │
       └─ All success?
          └─ ✅ APP IS LIVE!
```

---

## Decision Matrix: When to Deploy

| Situation | Action | Risk Level |
|-----------|--------|-----------|
| Feature ready, tests pass | ✅ Deploy to staging | 🟢 Low |
| Staging tests pass, team verified | ✅ Deploy to production | 🟢 Low |
| Database migration needed | ✅ Deploy (backup auto-created) | 🟡 Medium |
| Security patch needed | ✅ Deploy asap | 🟠 High |
| Just before major event/launch | ❌ Hold, deploy after success | 🟠 High |
| Team not available to monitor | ❌ Wait until team online | 🟡 Medium |
| Only hot-fix, no testing | ❌ Test first, always | 🔴 Critical |
| During known DB maintenance | ❌ Wait until finish | 🟠 High |

---

## Daily Workflow: Developer Perspective

```
┌──────────────────────────────────────────┐
│           Developer's Day                 │
└──────────────────────────────────────────┘
                  │
                  ▼ 9:00 AM
      ┌─────────────────────────┐
      │  Pull latest develop    │
      │  git fetch origin       │
      │  git pull origin develop│
      └────────┬────────────────┘
               │
               ▼ 9:05 AM
      ┌─────────────────────────┐
      │  Create feature branch  │
      │  git checkout -b        │
      │    feature/xyz          │
      └────────┬────────────────┘
               │
               ▼ 9:10 AM - 5:00 PM
      ┌─────────────────────────┐
      │  Code & Test Locally    │
      │  npm run dev            │
      │  npm run build          │
      │  npm test               │
      │  Test in browser        │
      └────────┬────────────────┘
               │
               ▼ 5:00 PM
      ┌─────────────────────────┐
      │  Commit Changes         │
      │  git add .              │
      │  git commit -am "msg"   │
      │  git push origin feature│
      └────────┬────────────────┘
               │
               ▼ 5:05 PM
      ┌─────────────────────────┐
      │  Create PR on GitHub    │
      │  - Request reviewers    │
      │  - Add description      │
      │  - Link issue (if any)  │
      └────────┬────────────────┘
               │
               ▼ 5:10 PM
      ┌─────────────────────────┐
      │ Wait for Review         │
      │ - Check tests pass      │
      │ - Respond to comments   │
      └────────┬────────────────┘
               │
               ▼ Next Day: 10:00 AM
      ┌─────────────────────────┐
      │ ✅ PR Approved          │
      │ Merge to develop        │
      │ Watch staging deploy    │
      │ (auto via GitHub)       │
      └────────┬────────────────┘
               │
               ▼ 10:15 AM
      ┌─────────────────────────┐
      │ Test on Staging         │
      │ curl https://staging... │
      │ Verify features work    │
      └────────┬────────────────┘
               │
               ▼ 10:20 AM
      ┌─────────────────────────┐
      │ Approve for Production  │
      │ (or wait for review)    │
      │ Merge develop → main    │
      │ Production auto deploys │
      └────────┬────────────────┘
               │
               ▼ 10:45 AM
      ┌─────────────────────────┐
      │ ✅ IN PRODUCTION!        │
      │ Feature live for users  │
      └─────────────────────────┘
```

---

## Staging vs Production: Key Differences

```
STAGING (develop branch)
├─ Auto-deploys on every push
├─ No approval gate
├─ Mirror of production setup
├─ Used for: Testing, QA, integration
├─ Failures: Low impact, limited users
└─ Deployment Time: ~15-20 minutes


PRODUCTION (main branch)
├─ Requires manual trigger or approval
├─ Approval gate (recommended)
├─ Real customer data
├─ Used for: Live service
├─ Failures: High impact, affects users
└─ Deployment Time: ~24-30 minutes
```

---

## Health Check Status Codes

```
GET /api/health
│
├─ 200 ✅ HEALTHY
│  └─ App running, database connected
│
├─ 503 ⚠️  DEGRADED
│  ├─ App running but database slow/unreachable
│  ├─ Memory usage high
│  └─ Connection pool exhausted
│
└─ Connection refused ❌ DOWN
   ├─ App crashed or not running
   ├─ Port not bound
   └─ Server unreachable
```

---

## Monitoring After Deployment

```
T+0 seconds: Deployment completes
├─ Action: Slack notification sent
├─ Check: GitHub Actions shows ✅
└─ Status: App restarting

T+30 seconds: App should be responding
├─ Action: Health check polls endpoint
├─ Check: GET /api/health returns 200
└─ Status: App ready for traffic

T+2 minutes: Smoke tests run
├─ Action: Run quick API tests
├─ Check: Key endpoints respond
└─ Status: Core functionality verified

T+5 minutes: Verify features
├─ Action: Manual testing of new features
├─ Check: UI appears correctly
├─ Check: New endpoints work
└─ Status: Everything working

T+30 minutes: Monitor logs
├─ Action: Tail PM2 logs
├─ Check: Watch for error patterns
├─ Check: Database query performance
└─ Status: No issues detected

✅ Deployment successful and stable!
```

---

## Emergency Rollback Procedure

```
Issue Detected
      │
      ▼
    Is it critical?
    ├─ YES: Immediate action needed
    └─ NO: Investigate, may be misjudgment

      │
      ▼
  Execute Rollback:
  
  Option 1: Automatic (from workflow)
  ├─ Workflow detects failure
  ├─ Auto-triggers rollback job
  ├─ Reverts latest commit
  ├─ Rebuilds old code
  ├─ Restarts app
  └─ Slack notifies team
  
  Option 2: Manual (if needed)
  ├─ SSH to server
  ├─ git reset --hard HEAD~1
  ├─ npm run build
  ├─ pm2 restart healthcare-app-prod
  └─ Verify: curl /api/health

      │
      ▼
  Investigate Root Cause
  ├─ Check git diff
  ├─ Review database migrations
  ├─ Check application logs
  ├─ Run tests locally
  └─ Document findings

      │
      ▼
  Post-Incident Review
  ├─ What went wrong?
  ├─ Why didn't tests catch it?
  ├─ How do we prevent this?
  └─ Update processes/tests

      │
      ▼
  Fix & Re-Deploy
  ├─ Make corrections
  ├─ Test thoroughly
  ├─ Deploy to staging
  ├─ Verify fix works
  └─ Deploy to production
```

---

## Slack Notification Examples

### Successful Deployment
```
✅ Production Deployment Successful
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Commit: abc1234
Author: john.doe
Message: "feat: add purchase order filtering"
Branch: main
Duration: 24 minutes
Time: 2026-04-06 14:30 UTC

Status: All health checks passed ✓
Database: v42 migrations applied ✓
Build: Successful ✓
App: Healthy and serving traffic ✓

👉 Monitor: https://your-prod-domain.com/api/health
```

### Failed Deployment (Auto-Rollback)
```
❌ Production Deployment FAILED - AUTO-ROLLBACK
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Commit: def5678  (rolled back)
Author: jane.smith
Message: "fix: update vendor schema"
Error: Database migration timeout after 60s

Status: ⚠️ ROLLED BACK to previous version
Database: Previous version restored ✓
App: Running on previous code ✓

Action Required: 
❗ Investigate what caused timeout
❗ Check database logs
❗ Re-test locally before re-deploying

👉 Logs: https://github.com/org/repo/actions/runs/12345
```

---

## Common Terminology

| Term | Meaning |
|------|---------|
| **Deploy** | Push code to production and restart app |
| **Migration** | Database schema change (add column, rename table, etc) |
| **Rollback** | Revert to previous version of code/database |
| **Health Check** | Ping app to verify it's running and responsive |
| **Smoke Tests** | Quick tests to verify basic functionality |
| **PR** | Pull Request (code review before merging) |
| **Main** | Production-ready branch (goes live) |
| **Develop** | Staging branch (testing ground) |
| **Feature** | Development branch (work in progress) |
| **Cluster Mode** | PM2 using all CPU cores for parallelism |
| **Zero-downtime** | Restart without interrupting users |
| **Backup** | Database copy for recovery if something breaks |

---

## Time Estimates

| Task | Duration | Notes |
|------|----------|-------|
| Local development | 1-8 hours | Varies by feature |
| PR review | 15-30 min | Depends on code complexity |
| Staging deployment | 15-20 min | Auto-triggered |
| Staging testing | 10-15 min | Manual verification |
| Production approval | 2-5 min | Click approve button |
| Production deployment | 20-30 min | Includes all safety steps |
| Post-deployment verification | 5-10 min | Check logs, test app |
| **Total for 1 feature** | **2-10 hours** | From start to live |

---

## Approval Workflow (Recommended)

```
Developer                GitHub              Reviewer            Production
    │                       │                    │                   │
    ├─ Push code ──────────▶ │                    │                   │
    │                       │                    │                   │
    ├─ Create PR ──────────▶ │ ◀──── notify───────┤                   │
    │                       │                    │                   │
    │                       ├─▶ CI tests run ◀──┤                   │
    │                       │                    │                   │
    │                       ├─ Staging deploys ─┤                   │
    │                       │                    │                   │
    │                       │    Review & Test   │                   │
    │                       │                    ├─ Test feature      │
    │                       │                    ├─ Run tests         │
    │                       │                    ├─ Verify DB OK      │
    │                       │                    │                   │
    │                       │ ◀────approve───────┤                   │
    │                       │ (set to "main")    │                   │
    │◀──notify───────────────┤                    │                   │
    │                       │ Production deploy  │                   │
    │                       │ starts...          │                   │
    │                       │                    │                   │
    │                       ├─ Backup DB ──────────────────────────▶ │
    │                       ├─ Run migrations ──────────────────────▶ │
    │                       ├─ Build app ───────────────────────────▶ │
    │                       ├─ Restart ─────────────────────────────▶ │
    │                       ├─ Health check ◀───────────────────────┤ ✓
    │                       │ Slack notified     │    Feature LIVE!  │
    │◀─ notify success ──────┤                    │                   │
    │                       │                    │                   │
    └─────────────────────────────────────────────────────────────────┘
     Users can now use the feature!
```

---

**Print this page or bookmark for visual reference!**

**Last Updated:** 2026-04-06

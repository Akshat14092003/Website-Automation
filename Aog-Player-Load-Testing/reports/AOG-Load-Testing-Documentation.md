# AOG Player Panel — Load Testing Documentation

**Project:** AOG Sweepstakes Casino  
**Module:** Player Panel Load Testing  
**Tool:** Grafana k6 v1.7.1  
**Prepared By:** QA Team  
**Date:** April 2026

---

## 1. What Is This Script?

This is an automated load testing suite built with **k6** that simulates real player behavior on the AOG backend. It creates hundreds/thousands of virtual users (bots) that simultaneously use the app — logging in, checking balances, submitting topups, claiming bonuses, creating support tickets — just like real players would.

The purpose is to answer:
- How many concurrent users can the server handle?
- Which APIs break under pressure?
- How fast does the server respond under load?
- Where are the bottlenecks?

---

## 2. What Does It Test?

### APIs Covered: 37 Internal Endpoints

| Category | APIs | What They Do |
|----------|------|-------------|
| Redemptions | 4 | Check balances, bank status, redemption history, withdraw history |
| Platform Topup | 5 | List platforms, topup info, submit topup, cancel topup, topup history |
| Platform Redeem | 4 | Redeem info, submit redeem, cancel redeem, redeem history |
| Platform Mega Offer | 3 | Check eligibility, dismiss offer, claim offer |
| Engagement - Verification | 3 | Verification status, claim email bonus, KYC status |
| Engagement - Daily Login | 3 | Daily login status, claim bonus, login history |
| Engagement - Referral | 6 | Referral status, validate code, get code, dashboard, friends, validate token |
| Engagement - Bonus | 1 | Bonus history |
| SEON IDV | 1 | IDV status check |
| Account Verification | 3 | Get/save verification info, update status |
| Support | 3 | Support summary, list tickets, create ticket |
| Transactions | 1 | Transaction history |

### APIs Excluded (External Services): 9 Endpoints

These hit third-party services and are excluded to avoid external API costs/rate limits:

| API | External Service | Reason Excluded |
|-----|-----------------|-----------------|
| POST /redemptions/finix-setup | Finix | Payment processor API call |
| POST /redemptions/request | Finix | Creates real payout |
| POST /engagement/verification/phone/send-otp | Plivo | Sends real SMS |
| POST /engagement/verification/phone/verify | Plivo | Validates via Plivo |
| POST /engagement/verification/kyc/upload | AWS S3 | File upload to S3 |
| POST /seon/create-session | SEON | Identity verification API |
| POST /seon/complete-session | SEON | Identity verification API |
| POST /address/validate | Geocoding API | External address lookup |
| POST /address/validate-zip | Geocoding API | External ZIP lookup |

---

## 3. How Does It Work?

### User Scenarios

The test simulates 7 types of real players, each with different behavior patterns:

| Scenario | Weight | Description |
|----------|--------|-------------|
| **Browsing Player** | 25% | Casual player checking balances, viewing history pages, browsing platforms. Read-heavy, no writes. |
| **Platform Player** | 20% | Active player submitting topup and redeem requests, cancelling them, viewing history. Full CRUD lifecycle. |
| **Engaged Player** | 15% | Returning player claiming daily login bonus, checking referral dashboard, viewing bonus history. |
| **New Player** | 10% | New user going through verification flow — checking KYC status, saving verification info, claiming email bonus. |
| **Support Seeker** | 10% | Player with issues — creating support tickets, checking transaction history, viewing balances. |
| **Redemption Player** | 10% | Player managing redemptions — checking bank status, viewing redemption and withdraw history. |
| **Promo Player** | 10% | Player interacting with promotional offers — checking mega offer eligibility, claiming/dismissing offers. |

### Test Types Available

| Type | Command | VUs | Duration | Purpose |
|------|---------|-----|----------|---------|
| **Smoke** | `.\run-test.ps1` | 5 | 3 min | Quick sanity check — does everything work? |
| **Load** | `.\run-test.ps1 -Stage load` | 1,000 | 22 min | Simulate normal heavy traffic |
| **Stress** | `.\run-test.ps1 -Stage stress` | 2,000 | 30 min | Push server to breaking point |
| **Spike** | `.\run-test.ps1 -Stage spike` | 500 | 5 min | Sudden traffic burst (0 to 500 instantly) |

### Load Test Ramp Pattern (1,000 Users)
```
0-2 min     -> 0 to 200 users (gradual ramp)
2-7 min     -> Hold at 200 users
7-10 min    -> 200 to 1,000 users (ramp up)
10-20 min   -> Hold at 1,000 users (peak load)
20-22 min   -> 1,000 to 0 (ramp down)
```

### Stress Test Ramp Pattern (2,000 Users)
```
0-2 min     -> 0 to 200 users
2-5 min     -> Hold at 200
5-8 min     -> 200 to 1,000 users
8-13 min    -> Hold at 1,000
13-18 min   -> 1,000 to 2,000 users
18-28 min   -> Hold at 2,000 (extreme load)
28-30 min   -> Ramp down to 0
```

### Spike Test Pattern (500 Users)
```
0-10s       -> 0 to 500 instantly (shock)
10s-1m40s   -> Hold at 500
1m40s-1m50s -> Drop to 0 instantly
1m50s-2m50s -> Recovery period (server rests)
2m50s-3m    -> 0 to 500 again (second spike)
3m-4m30s    -> Hold at 500
4m30s-5m    -> Ramp down
```

---

## 4. Test Infrastructure

### Test Users
- **Configurable account pool** — set via `USER_PREFIX`, `USER_EMAIL_DOMAIN`, `USER_START`, `USER_END` env vars
- **Password** — set via `TEST_PASSWORD` env var
- Each virtual user gets a unique account — no session conflicts
- Login happens once per VU (cached token)
- All users are logged out automatically after test completion

### Thresholds (Pass/Fail Criteria)
| Metric | Target |
|--------|--------|
| p(95) response time | < 500ms |
| p(99) response time | < 1,000ms |
| HTTP failure rate | < 1% |

### Reports Generated Automatically
After every test run:
1. **HTML Infographic Report** — Dark-themed visual report with charts, flow breakdowns, check details
2. **Excel Report** — 6 sheets: Summary, Scenarios, All Checks, Failed Checks (with root cause), Thresholds, Executive Summary
3. Reports are named dynamically: `AOG-{ENV}-{stage}-test_{timestamp}.html/xlsx`
4. Old reports are auto-deleted on new runs
5. HTML report auto-opens in browser

---

## 5. Project Structure

```
qa-team/player-load-testing/
├── config.js                  # Base URL, test users, stage configs, thresholds
├── helpers/
│   ├── auth.js                # Login/logout helpers with per-VU caching
│   └── report.js              # k6 handleSummary — saves JSON results
├── flows/                     # Individual flow scripts (runnable independently)
│   ├── 01-redemptions.js
│   ├── 02-engagement-verification.js
│   ├── 03-engagement-daily-login.js
│   ├── 04-engagement-referral.js
│   ├── 05-platform-topup.js
│   ├── 06-platform-redeem.js
│   ├── 07-platform-mega-offer.js
│   ├── 08-seon-idv.js
│   ├── 09-account-verification.js
│   ├── 10-support.js
│   ├── 11-address-validation.js
│   └── 12-transactions-bonus.js
├── member2-full-test.js       # Combined test with all 7 scenarios
├── run-test.ps1               # Wrapper script — runs k6 + generates report + logs out users
├── generate-report.js         # HTML + Excel report generator
├── logout-all.js              # Post-test cleanup — logs out all test users
├── package.json               # Node.js dependencies (xlsx)
├── results/                   # Raw JSON results from k6
└── reports/                   # Generated HTML + Excel reports
```

---

## 6. How to Run

### Prerequisites
1. k6 installed and in your PATH (or set `K6_PATH` env var)
2. Node.js installed
3. Run `npm install` in the player-load-testing folder (one-time setup)
4. Test users created in the target environment (see `.env.example` for account pool config)

### Commands
```powershell
cd /path/to/player-load-testing

# Smoke Test (5 users, 3 min)
.\run-test.ps1

# Load Test (1000 users, 22 min)
.\run-test.ps1 -Stage load

# Stress Test (2000 users, 30 min)
.\run-test.ps1 -Stage stress

# Spike Test (500 users, 5 min)
.\run-test.ps1 -Stage spike

# Run individual flow
.\run-test.ps1 -Script flows/01-redemptions.js

# Run individual flow with load stage
.\run-test.ps1 -Script flows/05-platform-topup.js -Stage load
```

### Switching Environments
Pass the `BASE_URL` env var at runtime:
```powershell
# Dev
$env:BASE_URL = "https://your-dev-api.example.com/api"; .\run-test.ps1

# QA
$env:BASE_URL = "https://your-qa-api.example.com/api"; .\run-test.ps1
```

---

## 7. Results So Far

### Dev Environment (1,000 VUs)

| Metric | Result |
|--------|--------|
| API Check Pass Rate | **99.4%** |
| HTTP Delivery Rate | 83.2% |
| Avg Response Time | 855ms |
| p(95) Response Time | 1,198ms |
| Throughput | 315.7 req/s |
| Total Requests | 419,263 |

**Key Findings:**
- All read APIs handle 1,000 users perfectly
- Write APIs (topup/redeem/claim) have ~2-3% failure rate due to DB connection pool limits
- Server starts showing strain beyond 500 concurrent users
- 16.8% of requests timed out (server couldn't respond, not API errors)

### QA Environment
- Server starts timing out around 500-530 concurrent users
- QA infrastructure appears to be smaller/weaker than dev
- Login requests are the first to timeout (DB-heavy operation)

---

## 8. What Can We Do Next

### Immediate Next Steps

1. **Run Stress Test on QA** — Lower VU count to 500 first, see where QA breaks, then gradually increase
2. **Run Spike Test on QA** — Test how QA handles sudden traffic bursts
3. **Fix Daily Login History API** — `GET /api/engagement/daily-login/history` returns non-200 in all tests. Needs backend investigation.
4. **Run tests on Staging/Production** — Same scripts, just change `BASE_URL` in config.js

### Additional Test Coverage

5. **Add Auth Flow Tests** — Test login, register, forgot password, OTP flows under load
6. **Add Game Session Tests** — Test game session create, heartbeat, end flow (this is the core gameplay loop)
7. **Add Purchase Flow Tests** — Test the GC purchase flow (without hitting real Finix)
8. **Add Game Catalog Tests** — Test game browsing (hot picks, fresh releases, slots, etc.)
9. **Socket.IO Load Test** — Test WebSocket connections for real-time features (force logout, account disabled). Requires Artillery or k6 xk6-websocket extension.
10. **Admin Panel Tests** — Teammate's responsibility — dashboard stats, user management, transaction reviews, reports

### Infrastructure Improvements to Test After

11. **Increase MySQL Connection Pool** — After backend team increases pool size, re-run load test to measure improvement
12. **Add Redis Caching** — After caching is added for balances/platform list, re-run to compare response times
13. **Test After Horizontal Scaling** — If multiple Express instances are deployed, test with higher VU counts
14. **Test with Rate Limiting** — After rate limits are added, verify they work correctly under load

### Advanced Testing

15. **Soak Test** — Run 50 VUs for 60+ minutes continuously to detect memory leaks and connection pool drift
16. **Endurance Test** — Run moderate load (200 VUs) for 2-4 hours to test long-term stability
17. **Geographic Distribution** — Run k6 from multiple regions using k6 Cloud to test CDN/geo performance
18. **Database Performance Test** — Use `mysqlslap` to directly test MySQL query performance under concurrent load
19. **Comparative Testing** — Run same tests before and after each backend deployment to track performance regression

### Reporting Improvements

20. **Grafana Dashboard** — Stream k6 results to Grafana for real-time monitoring during tests
21. **CI/CD Integration** — Add load tests to deployment pipeline — auto-run smoke test on every deploy
22. **Historical Tracking** — Store test results over time to track performance trends across releases
23. **Alerting** — Set up alerts when load test results degrade beyond thresholds

---

## 9. Known Issues

| Issue | Status | Details |
|-------|--------|---------|
| `GET /api/engagement/daily-login/history` always returns non-200 | Open | Backend bug — fails in every test regardless of load |
| QA server times out at ~530 concurrent users | Known | Infrastructure limit, not a code issue |
| Write APIs fail ~2-3% at 1,000 VUs | Known | MySQL connection pool exhaustion under high concurrency |
| Threshold checkmark/cross icons show as `â` in HTML | Cosmetic | Unicode rendering issue in some browsers |

---

*Document maintained by AOG QA Team | Last updated: April 2026*

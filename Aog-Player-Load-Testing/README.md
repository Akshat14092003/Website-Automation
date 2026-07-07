# Player Load Testing — k6 Suite

API load testing suite built with [Grafana k6](https://k6.io/), covering 37 internal API endpoints across 7 realistic user scenarios.

## Test Scenarios

| Scenario | Weight | What It Simulates |
|---|---|---|
| Browsing Player | 25% | Checking balances, viewing history, browsing platforms |
| Platform Player | 20% | Submitting and cancelling top-up/redeem requests |
| Engaged Player | 15% | Claiming daily login bonus, checking referral dashboard |
| New Player | 10% | Verification flow, KYC check, profile setup |
| Support Seeker | 10% | Creating support tickets, checking transaction history |
| Redemption Player | 10% | Redemption status, bank connection, withdraw history |
| Promo Player | 10% | Mega offers and referral promotions |

## Individual Flow Tests

| File | APIs Covered |
|---|---|
| `flows/01-redemptions.js` | Balances, bank status, finix setup, request redemption, history |
| `flows/02-engagement-verification.js` | Verification status and claims |
| `flows/03-engagement-daily-login.js` | Daily login status, claim, history |
| `flows/04-engagement-referral.js` | Referral code, dashboard, friends, validate |
| `flows/05-platform-topup.js` | Topup info, submit, cancel, history |
| `flows/06-platform-redeem.js` | Redeem info, submit, cancel, history |
| `flows/07-platform-mega-offer.js` | Mega offer eligibility, claim, dismiss |
| `flows/08-seon-idv.js` | SEON IDV status |
| `flows/09-account-verification.js` | Verification save, info, status update |
| `flows/10-support.js` | Support summary, tickets list, create ticket |
| `flows/11-address-validation.js` | Address validation |
| `flows/12-transactions-bonus.js` | Transaction history, bonus history |

## Prerequisites

- [k6](https://k6.io/docs/getting-started/installation/) installed and in your PATH (or set `K6_PATH`)
- A running backend API
- QA test accounts created matching your `USER_PREFIX` + `USER_EMAIL_DOMAIN` pattern

## Setup

```bash
# Copy and fill in env vars
cp .env.example .env
```

## Running Tests

### PowerShell (recommended)
```powershell
# Smoke test (default)
.\run-test.ps1

# Load test (1000 VUs)
.\run-test.ps1 -Stage load

# Stress test (2000 VUs)
.\run-test.ps1 -Stage stress
```

### npm scripts
```bash
npm run smoke:all
npm run load:all
npm run stress:all
```

### Individual flows
```bash
k6 run -e BASE_URL=https://your-api.example.com/api flows/01-redemptions.js
```

### With all env vars
```bash
k6 run -e BASE_URL=https://your-api.example.com/api \
       -e TEST_PASSWORD=YourPass \
       -e USER_PREFIX=testuser \
       -e USER_EMAIL_DOMAIN=example.com \
       -e USER_START=1 \
       -e USER_END=100 \
       -e STAGE=smoke \
       member2-full-test.js
```

## Reports

After a run, generate the Excel + HTML report:
```bash
npm run report
```

Reports are saved to `reports/`. The `results/latest-result.json` is the raw k6 summary used for report generation.

## Cleanup

After testing, log out all test sessions:
```bash
node logout-all.js
```

## Stage Presets

| Stage | Max Users | Duration |
|---|---|---|
| smoke | 5 | 3 min |
| load | 1,000 | ~22 min |
| stress | 2,000 | ~30 min |
| spike | 500 | ~5 min |

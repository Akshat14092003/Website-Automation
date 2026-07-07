# Website Automation

A collection of test automation projects covering web application testing and API load testing.

---

## Projects

### 1. Total Liquor Automation
**Tool:** [Playwright](https://playwright.dev/) | **Type:** E2E Web Automation

End-to-end test automation for the Total Liquor web application. Covers login flows, product catalogue testing, add-to-cart validation, and product image verification across paginated results.

| Suite | Coverage |
|---|---|
| Login Tests | Valid/invalid login, field validation, SQL injection, XSS |
| Product Cart Tests | Add all products to cart across paginated catalogue |
| Product Image Tests | Verify real product images load on detail pages |

**Tech:** Node.js, Playwright, ExcelJS

---

### 2. Aog Player Load Testing
**Tool:** [Grafana k6](https://k6.io/) | **Type:** API Load Testing

Load testing suite for the AOG Player Panel backend, covering 37 internal API endpoints across 7 realistic user behaviour scenarios. Designed to measure performance under smoke, load, stress, and spike conditions.

| Scenario | Weight | What It Simulates |
|---|---|---|
| Browsing Player | 25% | Checking balances, history, browsing platforms |
| Platform Player | 20% | Top-up and redeem request lifecycle |
| Engaged Player | 15% | Daily login bonus, referral dashboard |
| New Player | 10% | Verification flow, KYC, profile setup |
| Support Seeker | 10% | Creating tickets, transaction history |
| Redemption Player | 10% | Redemption status, bank connection |
| Promo Player | 10% | Mega offers and referral promotions |

**Tech:** k6, Node.js, ExcelJS

---

## Repository Structure

```
Website-Automation/
├── Total Liquor Automation/       # Playwright E2E tests
│   ├── pages/                     # Page Object Models
│   ├── tests/                     # Test specs
│   ├── utils/                     # Config, Excel helpers
│   └── README.md
│
└── Aog-Player-Load-Testing/       # k6 API load tests
    ├── flows/                     # Individual flow scripts (12 flows)
    ├── helpers/                   # Auth and report helpers
    ├── results/                   # Raw k6 JSON output
    ├── reports/                   # Generated HTML + Excel reports
    └── README.md
```

---

## Quick Start

Each project has its own `README.md` with full setup and run instructions. See:
- [`Total Liquor Automation/README.md`](./Total%20Liquor%20Automation/README.md)
- [`Aog-Player-Load-Testing/README.md`](./Aog-Player-Load-Testing/README.md)

---

## Tech Stack

| Tool | Purpose |
|---|---|
| Playwright | Browser automation & E2E testing |
| Grafana k6 | API load & performance testing |
| Node.js | Runtime for scripts and reporting |
| ExcelJS / xlsx | Test report generation |

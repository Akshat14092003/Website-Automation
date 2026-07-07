# Total Liquor — Playwright E2E Automation Suite

End-to-end test automation for the Total Liquor web app using [Playwright](https://playwright.dev/).

## Test Suites

| Suite | File | Coverage |
|---|---|---|
| Login | `tests/login-test.spec.js` | Valid/invalid login, field validation, SQL injection, XSS |
| Product Cart | `tests/product-test.spec.js` | Add all products to cart across paginated product catalogue |
| Product Images | `tests/product-image-test.spec.js` | Verify real product images load on detail pages |

## Setup

### 1. Install dependencies
```bash
npm install
npx playwright install
```

### 2. Configure environment variables
```bash
cp .env.example .env
# Edit .env and fill in TEST_EMAIL and TEST_PASSWORD
```

### 3. Run tests
```bash
# Login tests
npx playwright test tests/login-test.spec.js

# Product cart tests
npx playwright test tests/product-test.spec.js

# Product image tests
npx playwright test tests/product-image-test.spec.js
```

## Reports

Excel reports are generated in the `reports/` folder after each run.

## Environment Variables

See `.env.example` for all supported variables.

// ===========================================================
// AOG Player Load Test — Combined Weighted Scenario (37 Internal APIs)
// ===========================================================
// Run:
//   Smoke:  .\run-test.ps1
//   Load:   .\run-test.ps1 -Stage load     (500 VUs, ~22 min)
//   Stress: .\run-test.ps1 -Stage stress   (1000 VUs, ~30 min)
// ===========================================================
//
// Scenarios (weighted):
//   25% — Browsing Player (read-heavy: balances, history, catalog)
//   20% — Platform Player (topup submit/cancel, redeem submit/cancel)
//   15% — Engaged Player (daily login, referral, bonus history)
//   10% — New Player (verification, KYC, profile setup)
//   10% — Support Seeker (tickets, transaction history)
//   10% — Redemption Player (balances, bank status, redeem history)
//   10% — Mega Offer / Promo (eligibility, claim, dismiss)
// ===========================================================
import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { BASE_URL, THRESHOLDS, getStages, authHeaders, DEFAULT_HEADERS } from './config.js';
import { getAuth } from './helpers/auth.js';
export { handleSummary } from './helpers/report.js';

export const options = {
  stages: getStages(),
  thresholds: THRESHOLDS,
};

// ===========================================================
// SCENARIO 1: Browsing Player (read-heavy)
// A player just browsing — checks balances, views history pages
// ===========================================================
function scenarioBrowsingPlayer(headers) {
  group('Browsing Player', () => {
    // Check balances
    let res = http.get(`${BASE_URL}/redemptions/balances`, {
      headers,
      tags: { name: 'GET /redemptions/balances' },
    });
    check(res, { 'balances: status 200': (r) => r.status === 200 });
    sleep(1);

    // View transaction history
    res = http.get(`${BASE_URL}/transactions/history?page=1&limit=10&category=&currency=&type=`, {
      headers,
      tags: { name: 'GET /transactions/history' },
    });
    check(res, { 'txn-history: status 200': (r) => r.status === 200 });
    sleep(1);

    // View redemption history
    res = http.get(`${BASE_URL}/redemptions/history?page=1&limit=10`, {
      headers,
      tags: { name: 'GET /redemptions/history' },
    });
    check(res, { 'redeem-history: status 200': (r) => r.status === 200 });
    sleep(1);

    // View bonus history
    res = http.get(`${BASE_URL}/engagement/bonus/history?page=1&limit=10`, {
      headers,
      tags: { name: 'GET /engagement/bonus/history' },
    });
    check(res, { 'bonus-history: status 200': (r) => r.status === 200 });
    sleep(1);

    // Check platform list
    res = http.get(`${BASE_URL}/platform/platforms`, {
      headers,
      tags: { name: 'GET /platform/platforms' },
    });
    check(res, { 'platforms: status 200': (r) => r.status === 200 });
    sleep(1);

    // View withdraw history
    res = http.get(`${BASE_URL}/redemptions/withdraw-history?page=1&limit=10&type=`, {
      headers,
      tags: { name: 'GET /redemptions/withdraw-history' },
    });
    check(res, { 'withdraw-history: status 200': (r) => r.status === 200 });
    sleep(1);

    // Check support summary
    res = http.get(`${BASE_URL}/support/summary`, {
      headers,
      tags: { name: 'GET /support/summary' },
    });
    check(res, { 'support-summary: status 200': (r) => r.status === 200 });
    sleep(1);
  });
}

// ===========================================================
// SCENARIO 2: Platform Player (topup + redeem lifecycle)
// A player actively using platform topup and redeem features
// ===========================================================
function scenarioPlatformPlayer(headers) {
  group('Platform Player', () => {
    // Check topup info
    let res = http.get(`${BASE_URL}/platform/topup/info`, {
      headers,
      tags: { name: 'GET /platform/topup/info' },
    });
    check(res, { 'topup-info: status 200': (r) => r.status === 200 });
    sleep(1);

    // Submit topup
    let topupId = null;
    res = http.post(
      `${BASE_URL}/platform/topup/submit`,
      JSON.stringify({ platformName: 'Test Platform', scAmount: 10 }),
      { headers, tags: { name: 'POST /platform/topup/submit' } },
    );
    check(res, { 'topup-submit: responded': (r) => r.status > 0 });
    if (res.status === 200) {
      try { topupId = JSON.parse(res.body).data?.id || JSON.parse(res.body).data?.requestId; } catch { /* */ }
    }
    sleep(2);

    // Cancel topup
    if (topupId) {
      res = http.put(
        `${BASE_URL}/platform/topup/${topupId}/cancel`,
        JSON.stringify({ reason: 'Changed my mind' }),
        { headers, tags: { name: 'PUT /platform/topup/:id/cancel' } },
      );
      check(res, { 'topup-cancel: responded': (r) => r.status > 0 });
      sleep(1);
    }

    // View topup history
    res = http.get(`${BASE_URL}/platform/topup/history?page=1&limit=10&status=`, {
      headers,
      tags: { name: 'GET /platform/topup/history' },
    });
    check(res, { 'topup-history: status 200': (r) => r.status === 200 });
    sleep(1);

    // Check redeem info
    res = http.get(`${BASE_URL}/platform/redeem/info`, {
      headers,
      tags: { name: 'GET /platform/redeem/info' },
    });
    check(res, { 'redeem-info: status 200': (r) => r.status === 200 });
    sleep(1);

    // Submit redeem
    let redeemId = null;
    res = http.post(
      `${BASE_URL}/platform/redeem/submit`,
      JSON.stringify({ platformName: 'Test Platform', scAmount: 10 }),
      { headers, tags: { name: 'POST /platform/redeem/submit' } },
    );
    check(res, { 'redeem-submit: responded': (r) => r.status > 0 });
    if (res.status === 200) {
      try { redeemId = JSON.parse(res.body).data?.id || JSON.parse(res.body).data?.requestId; } catch { /* */ }
    }
    sleep(2);

    // Cancel redeem
    if (redeemId) {
      res = http.put(
        `${BASE_URL}/platform/redeem/${redeemId}/cancel`,
        JSON.stringify({ reason: 'Changed my mind' }),
        { headers, tags: { name: 'PUT /platform/redeem/:id/cancel' } },
      );
      check(res, { 'redeem-cancel: responded': (r) => r.status > 0 });
      sleep(1);
    }

    // View redeem history
    res = http.get(`${BASE_URL}/platform/redeem/history?page=1&limit=10&status=`, {
      headers,
      tags: { name: 'GET /platform/redeem/history' },
    });
    check(res, { 'redeem-history: status 200': (r) => r.status === 200 });
    sleep(1);
  });
}

// ===========================================================
// SCENARIO 3: Engaged Player (daily login + referral + bonuses)
// A returning player claiming rewards and checking referrals
// ===========================================================
function scenarioEngagedPlayer(headers) {
  group('Engaged Player', () => {
    // Check daily login status
    let res = http.get(`${BASE_URL}/engagement/daily-login/status`, {
      headers,
      tags: { name: 'GET /engagement/daily-login/status' },
    });
    check(res, { 'dl-status: status 200': (r) => r.status === 200 });
    sleep(1);

    // Claim daily login
    res = http.post(`${BASE_URL}/engagement/daily-login/claim`, null, {
      headers,
      tags: { name: 'POST /engagement/daily-login/claim' },
    });
    check(res, { 'dl-claim: responded': (r) => r.status > 0 });
    sleep(1);

    // View daily login history
    res = http.get(`${BASE_URL}/engagement/daily-login/history?page=1&limit=10`, {
      headers,
      tags: { name: 'GET /engagement/daily-login/history' },
    });
    check(res, { 'dl-history: responded': (r) => r.status > 0 });
    sleep(1);

    // Check referral status (public)
    res = http.get(`${BASE_URL}/engagement/referral/status`, {
      headers: DEFAULT_HEADERS,
      tags: { name: 'GET /engagement/referral/status' },
    });
    check(res, { 'ref-status: status 200': (r) => r.status === 200 });
    sleep(1);

    // Get my referral code
    res = http.get(`${BASE_URL}/engagement/referral/code`, {
      headers,
      tags: { name: 'GET /engagement/referral/code' },
    });
    check(res, { 'ref-code: responded': (r) => r.status > 0 });
    sleep(1);

    // View referral dashboard
    res = http.get(`${BASE_URL}/engagement/referral/dashboard`, {
      headers,
      tags: { name: 'GET /engagement/referral/dashboard' },
    });
    check(res, { 'ref-dashboard: status 200': (r) => r.status === 200 });
    sleep(1);

    // View referred friends
    res = http.get(`${BASE_URL}/engagement/referral/friends`, {
      headers,
      tags: { name: 'GET /engagement/referral/friends' },
    });
    check(res, { 'ref-friends: status 200': (r) => r.status === 200 });
    sleep(1);

    // View bonus history
    res = http.get(`${BASE_URL}/engagement/bonus/history?page=1&limit=10`, {
      headers,
      tags: { name: 'GET /engagement/bonus/history' },
    });
    check(res, { 'bonus-history: status 200': (r) => r.status === 200 });
    sleep(1);
  });
}

// ===========================================================
// SCENARIO 4: New Player (verification + profile setup)
// A new user going through verification and profile completion
// ===========================================================
function scenarioNewPlayer(headers, userData) {
  group('New Player', () => {
    // Check verification status
    let res = http.get(`${BASE_URL}/engagement/verification/status`, {
      headers,
      tags: { name: 'GET /engagement/verification/status' },
    });
    check(res, { 'ver-status: status 200': (r) => r.status === 200 });
    sleep(1);

    // Claim email verification bonus
    res = http.post(`${BASE_URL}/engagement/verification/claim/email`, null, {
      headers,
      tags: { name: 'POST /engagement/verification/claim/email' },
    });
    check(res, { 'claim-email: responded': (r) => r.status > 0 });
    sleep(1);

    // Check KYC status
    res = http.get(`${BASE_URL}/engagement/verification/kyc/status`, {
      headers,
      tags: { name: 'GET /engagement/verification/kyc/status' },
    });
    check(res, { 'kyc-status: status 200': (r) => r.status === 200 });
    sleep(1);

    // Save verification info
    res = http.post(
      `${BASE_URL}/verification/save`,
      JSON.stringify({
        firstName: 'Load',
        lastName: `Tester${__VU}`,
        dateOfBirth: '1990-01-15',
        address: `${100 + __VU} Test Street`,
        city: 'Las Vegas',
        state: 'NV',
        zipCode: '89101',
        country: 'US',
      }),
      { headers, tags: { name: 'POST /verification/save' } },
    );
    check(res, { 'ver-save: responded': (r) => r.status > 0 });
    sleep(1);

    // Get verification info
    res = http.get(`${BASE_URL}/verification/info`, {
      headers,
      tags: { name: 'GET /verification/info' },
    });
    check(res, { 'ver-info: responded': (r) => r.status > 0 });
    sleep(1);

    // Update verification status
    const memberId = userData?.member_id || userData?.memberId || 'TESTMEMBER01';
    res = http.put(
      `${BASE_URL}/verification/status`,
      JSON.stringify({ memberId, status: 'pending' }),
      { headers, tags: { name: 'PUT /verification/status' } },
    );
    check(res, { 'ver-update: responded': (r) => r.status > 0 });
    sleep(1);

    // Check SEON IDV status
    res = http.get(`${BASE_URL}/seon/status`, {
      headers,
      tags: { name: 'GET /seon/status' },
    });
    check(res, { 'seon-status: status 200': (r) => r.status === 200 });
    sleep(1);

    // Validate a referral code (public)
    res = http.post(
      `${BASE_URL}/engagement/referral/validate`,
      JSON.stringify({ code: 'TEST1234' }),
      { headers: DEFAULT_HEADERS, tags: { name: 'POST /engagement/referral/validate' } },
    );
    check(res, { 'ref-validate: responded': (r) => r.status > 0 });
    sleep(1);
  });
}

// ===========================================================
// SCENARIO 5: Support Seeker (tickets + history)
// A player having issues, creating tickets, checking history
// ===========================================================
function scenarioSupportSeeker(headers) {
  group('Support Seeker', () => {
    // Check support summary
    let res = http.get(`${BASE_URL}/support/summary`, {
      headers,
      tags: { name: 'GET /support/summary' },
    });
    check(res, { 'support-summary: status 200': (r) => r.status === 200 });
    sleep(1);

    // View existing tickets
    res = http.get(`${BASE_URL}/support/tickets?page=1&limit=10`, {
      headers,
      tags: { name: 'GET /support/tickets' },
    });
    check(res, { 'support-list: status 200': (r) => r.status === 200 });
    sleep(1);

    // Create a new ticket
    const departments = ['TECHNICAL', 'DISPATCH', 'FINANCE', 'OTHER'];
    res = http.post(
      `${BASE_URL}/support/tickets`,
      JSON.stringify({
        title: `Load Test Ticket VU${__VU} Iter${__ITER}`,
        department: departments[__VU % departments.length],
        comment: `Automated load test support ticket from VU ${__VU}, iteration ${__ITER}. Please ignore.`,
      }),
      { headers, tags: { name: 'POST /support/tickets' } },
    );
    check(res, { 'support-create: responded': (r) => r.status > 0 });
    sleep(2);

    // View transaction history
    res = http.get(`${BASE_URL}/transactions/history?page=1&limit=10&category=&currency=&type=`, {
      headers,
      tags: { name: 'GET /transactions/history' },
    });
    check(res, { 'txn-history: status 200': (r) => r.status === 200 });
    sleep(1);

    // Check balances
    res = http.get(`${BASE_URL}/redemptions/balances`, {
      headers,
      tags: { name: 'GET /redemptions/balances' },
    });
    check(res, { 'balances: status 200': (r) => r.status === 200 });
    sleep(1);
  });
}

// ===========================================================
// SCENARIO 6: Redemption Player (checking redemption status)
// A player managing their redemptions and bank details
// ===========================================================
function scenarioRedemptionPlayer(headers) {
  group('Redemption Player', () => {
    // Check balances
    let res = http.get(`${BASE_URL}/redemptions/balances`, {
      headers,
      tags: { name: 'GET /redemptions/balances' },
    });
    check(res, {
      'balances: status 200': (r) => r.status === 200,
      'balances: success': (r) => JSON.parse(r.body).success === true,
    });
    sleep(1);

    // Check bank connection status
    res = http.get(`${BASE_URL}/redemptions/finix-bank-status`, {
      headers,
      tags: { name: 'GET /redemptions/finix-bank-status' },
    });
    check(res, { 'bank-status: responded': (r) => r.status === 200 || r.status === 404 });
    sleep(1);

    // View redemption history
    res = http.get(`${BASE_URL}/redemptions/history?page=1&limit=10`, {
      headers,
      tags: { name: 'GET /redemptions/history' },
    });
    check(res, { 'redeem-history: status 200': (r) => r.status === 200 });
    sleep(1);

    // View withdraw history
    res = http.get(`${BASE_URL}/redemptions/withdraw-history?page=1&limit=10&type=`, {
      headers,
      tags: { name: 'GET /redemptions/withdraw-history' },
    });
    check(res, { 'withdraw-history: status 200': (r) => r.status === 200 });
    sleep(1);
  });
}

// ===========================================================
// SCENARIO 7: Mega Offer / Promo Player
// A player checking and interacting with promotional offers
// ===========================================================
function scenarioPromoPlayer(headers) {
  group('Promo Player', () => {
    // Check mega offer eligibility
    let res = http.get(`${BASE_URL}/platform/mega-offer/eligibility`, {
      headers,
      tags: { name: 'GET /platform/mega-offer/eligibility' },
    });
    check(res, { 'mega-elig: responded': (r) => r.status > 0 });
    sleep(1);

    // Dismiss mega offer
    res = http.post(`${BASE_URL}/platform/mega-offer/dismiss`, null, {
      headers,
      tags: { name: 'POST /platform/mega-offer/dismiss' },
    });
    check(res, { 'mega-dismiss: responded': (r) => r.status > 0 });
    sleep(2);

    // Claim mega offer
    res = http.post(`${BASE_URL}/platform/mega-offer/claim`, null, {
      headers,
      tags: { name: 'POST /platform/mega-offer/claim' },
    });
    check(res, { 'mega-claim: responded': (r) => r.status > 0 });
    sleep(1);

    // Check referral status
    res = http.get(`${BASE_URL}/engagement/referral/status`, {
      headers: DEFAULT_HEADERS,
      tags: { name: 'GET /engagement/referral/status' },
    });
    check(res, { 'ref-status: status 200': (r) => r.status === 200 });
    sleep(1);

    // Validate a referral token
    const dummyToken = 'a'.repeat(64);
    res = http.get(`${BASE_URL}/referral/validate/${dummyToken}`, {
      headers: DEFAULT_HEADERS,
      tags: { name: 'GET /referral/validate/:token' },
    });
    check(res, { 'ref-token: responded': (r) => r.status > 0 });
    sleep(1);
  });
}

// ===========================================================
// MAIN — Weighted scenario selection
// ===========================================================
export default function () {
  const { token, userData } = getAuth();
  if (!token) return;
  const headers = authHeaders(token);
  const roll = Math.random() * 100;

  if (roll < 25) {
    scenarioBrowsingPlayer(headers);           // 25% — read-heavy browsing
  } else if (roll < 45) {
    scenarioPlatformPlayer(headers);            // 20% — topup/redeem lifecycle
  } else if (roll < 60) {
    scenarioEngagedPlayer(headers);             // 15% — daily login + referrals
  } else if (roll < 70) {
    scenarioNewPlayer(headers, userData);       // 10% — verification + profile
  } else if (roll < 80) {
    scenarioSupportSeeker(headers);             // 10% — tickets + history
  } else if (roll < 90) {
    scenarioRedemptionPlayer(headers);          // 10% — redemption management
  } else {
    scenarioPromoPlayer(headers);               // 10% — mega offer + promos
  }
}

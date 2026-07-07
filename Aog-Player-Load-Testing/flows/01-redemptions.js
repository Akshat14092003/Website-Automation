// ===========================================================
// AOG Player Load Test — Redemptions Flow (6 APIs)
// ===========================================================
// Run: k6 run -e BASE_URL=http://localhost:5001/api flows/01-redemptions.js
// ===========================================================
import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { BASE_URL, THRESHOLDS, getStages, authHeaders } from '../config.js';
import { getAuth } from '../helpers/auth.js';
export { handleSummary } from '../helpers/report.js';

export const options = {
  stages: getStages(),
  thresholds: THRESHOLDS,
};

export default function () {
  const { token } = getAuth();
  if (!token) return;
  const headers = authHeaders(token);

  // ---------------------------------------------------------
  // 1. GET /redemptions/balances
  // ---------------------------------------------------------
  group('Redemptions — Get Balances', () => {
    const res = http.get(`${BASE_URL}/redemptions/balances`, {
      headers,
      tags: { name: 'GET /redemptions/balances' },
    });
    check(res, {
      'balances: status 200': (r) => r.status === 200,
      'balances: success true': (r) => JSON.parse(r.body).success === true,
    });
    sleep(1);
  });

  // ---------------------------------------------------------
  // 2. GET /redemptions/finix-bank-status
  // ---------------------------------------------------------
  group('Redemptions — Finix Bank Status', () => {
    const res = http.get(`${BASE_URL}/redemptions/finix-bank-status`, {
      headers,
      tags: { name: 'GET /redemptions/finix-bank-status' },
    });
    check(res, {
      'bank-status: status 200 or 404': (r) => r.status === 200 || r.status === 404,
      'bank-status: has success field': (r) => JSON.parse(r.body).success !== undefined,
    });
    sleep(1);
  });

  // ---------------------------------------------------------
  // 3. POST /redemptions/finix-setup
  // ---------------------------------------------------------
  group('Redemptions — Finix Bank Setup', () => {
    const payload = JSON.stringify({
      firstName: 'Load',
      lastName: 'Tester',
      address1: '123 Test St',
      city: 'Las Vegas',
      state: 'NV',
      zip: '89101',
      email: `loadtest+${__VU}@example.com`,
      phone: '5551234567',
      accountNumber: '1234567890',
      routingNumber: '021000021',
      accountType: 'CHECKING',
      accountHolderName: 'Load Tester',
    });
    const res = http.post(`${BASE_URL}/redemptions/finix-setup`, payload, {
      headers,
      tags: { name: 'POST /redemptions/finix-setup' },
    });
    check(res, {
      'finix-setup: status 200 or 400': (r) => r.status === 200 || r.status === 400,
      'finix-setup: has success field': (r) => JSON.parse(r.body).success !== undefined,
    });
    sleep(2);
  });

  // ---------------------------------------------------------
  // 4. POST /redemptions/request
  // ---------------------------------------------------------
  group('Redemptions — Request Redemption', () => {
    const payload = JSON.stringify({
      scAmount: 10,
      redemptionType: 'cash',
      paymentProvider: 'finix',
    });
    const res = http.post(`${BASE_URL}/redemptions/request`, payload, {
      headers,
      tags: { name: 'POST /redemptions/request' },
    });
    check(res, {
      'request: status 200 or 400': (r) => r.status === 200 || r.status === 400,
      'request: has success field': (r) => JSON.parse(r.body).success !== undefined,
    });
    sleep(2);
  });

  // ---------------------------------------------------------
  // 5. GET /redemptions/history
  // ---------------------------------------------------------
  group('Redemptions — History', () => {
    const res = http.get(`${BASE_URL}/redemptions/history?page=1&limit=10`, {
      headers,
      tags: { name: 'GET /redemptions/history' },
    });
    check(res, {
      'history: status 200': (r) => r.status === 200,
      'history: success true': (r) => JSON.parse(r.body).success === true,
    });
    sleep(1);
  });

  // ---------------------------------------------------------
  // 6. GET /redemptions/withdraw-history
  // ---------------------------------------------------------
  group('Redemptions — Withdraw History', () => {
    const res = http.get(`${BASE_URL}/redemptions/withdraw-history?page=1&limit=10&type=`, {
      headers,
      tags: { name: 'GET /redemptions/withdraw-history' },
    });
    check(res, {
      'withdraw-history: status 200': (r) => r.status === 200,
      'withdraw-history: success true': (r) => JSON.parse(r.body).success === true,
    });
    sleep(1);
  });
}

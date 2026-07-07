// ===========================================================
// AOG Player Load Test — Engagement: Referral (6 APIs)
// ===========================================================
// Run: k6 run -e BASE_URL=http://localhost:5001/api flows/04-engagement-referral.js
// ===========================================================
import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { BASE_URL, THRESHOLDS, getStages, authHeaders, DEFAULT_HEADERS } from '../config.js';
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
  // 1. GET /engagement/referral/status (Public)
  // ---------------------------------------------------------
  group('Referral — Feature Status', () => {
    const res = http.get(`${BASE_URL}/engagement/referral/status`, {
      headers: DEFAULT_HEADERS,
      tags: { name: 'GET /engagement/referral/status' },
    });
    check(res, {
      'ref-status: status 200': (r) => r.status === 200,
      'ref-status: success true': (r) => JSON.parse(r.body).success === true,
    });
    sleep(1);
  });

  // ---------------------------------------------------------
  // 2. POST /engagement/referral/validate (Public)
  // ---------------------------------------------------------
  group('Referral — Validate Code', () => {
    const payload = JSON.stringify({ code: 'TEST1234' });
    const res = http.post(`${BASE_URL}/engagement/referral/validate`, payload, {
      headers: DEFAULT_HEADERS,
      tags: { name: 'POST /engagement/referral/validate' },
    });
    check(res, {
      'ref-validate: status 200 or 400 or 404': (r) =>
        r.status === 200 || r.status === 400 || r.status === 404,
      'ref-validate: has success field': (r) => JSON.parse(r.body).success !== undefined,
    });
    sleep(1);
  });

  // ---------------------------------------------------------
  // 3. GET /engagement/referral/code (JWT)
  // ---------------------------------------------------------
  group('Referral — Get My Code', () => {
    const res = http.get(`${BASE_URL}/engagement/referral/code`, {
      headers,
      tags: { name: 'GET /engagement/referral/code' },
    });
    check(res, {
      'ref-code: status 200': (r) => r.status === 200,
      'ref-code: has success field': (r) => JSON.parse(r.body).success !== undefined,
    });
    sleep(1);
  });

  // ---------------------------------------------------------
  // 4. GET /engagement/referral/dashboard (JWT)
  // ---------------------------------------------------------
  group('Referral — Dashboard', () => {
    const res = http.get(`${BASE_URL}/engagement/referral/dashboard`, {
      headers,
      tags: { name: 'GET /engagement/referral/dashboard' },
    });
    check(res, {
      'ref-dashboard: status 200': (r) => r.status === 200,
      'ref-dashboard: success true': (r) => JSON.parse(r.body).success === true,
    });
    sleep(1);
  });

  // ---------------------------------------------------------
  // 5. GET /engagement/referral/friends (JWT)
  // ---------------------------------------------------------
  group('Referral — Friends List', () => {
    const res = http.get(`${BASE_URL}/engagement/referral/friends`, {
      headers,
      tags: { name: 'GET /engagement/referral/friends' },
    });
    check(res, {
      'ref-friends: status 200': (r) => r.status === 200,
      'ref-friends: success true': (r) => JSON.parse(r.body).success === true,
    });
    sleep(1);
  });

  // ---------------------------------------------------------
  // 6. GET /referral/validate/:token (Public)
  // ---------------------------------------------------------
  group('Referral — Validate Token', () => {
    const dummyToken = 'a'.repeat(64);
    const res = http.get(`${BASE_URL}/referral/validate/${dummyToken}`, {
      headers: DEFAULT_HEADERS,
      tags: { name: 'GET /referral/validate/:token' },
    });
    check(res, {
      'ref-token: status 200 or 400 or 404': (r) =>
        r.status === 200 || r.status === 400 || r.status === 404,
      'ref-token: has success field': (r) => JSON.parse(r.body).success !== undefined,
    });
    sleep(1);
  });
}

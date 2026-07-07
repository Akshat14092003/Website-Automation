// ===========================================================
// AOG Player Load Test — Engagement: Daily Login (3 APIs)
// ===========================================================
// Run: k6 run -e BASE_URL=http://localhost:5001/api flows/03-engagement-daily-login.js
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
  // 1. GET /engagement/daily-login/status
  // ---------------------------------------------------------
  group('Daily Login — Get Status', () => {
    const res = http.get(`${BASE_URL}/engagement/daily-login/status`, {
      headers,
      tags: { name: 'GET /engagement/daily-login/status' },
    });
    check(res, {
      'dl-status: status 200': (r) => r.status === 200,
      'dl-status: success true': (r) => JSON.parse(r.body).success === true,
    });
    sleep(1);
  });

  // ---------------------------------------------------------
  // 2. POST /engagement/daily-login/claim
  //    (can only claim once/day — "already claimed" is acceptable)
  // ---------------------------------------------------------
  group('Daily Login — Claim', () => {
    const res = http.post(`${BASE_URL}/engagement/daily-login/claim`, null, {
      headers,
      tags: { name: 'POST /engagement/daily-login/claim' },
    });
    check(res, {
      'dl-claim: status 200 or 400': (r) => r.status === 200 || r.status === 400,
      'dl-claim: has success field': (r) => JSON.parse(r.body).success !== undefined,
    });
    sleep(2);
  });

  // ---------------------------------------------------------
  // 3. GET /engagement/daily-login/history
  // ---------------------------------------------------------
  group('Daily Login — History', () => {
    const res = http.get(`${BASE_URL}/engagement/daily-login/history?page=1&limit=10`, {
      headers,
      tags: { name: 'GET /engagement/daily-login/history' },
    });
    check(res, {
      'dl-history: status 200': (r) => r.status === 200,
      'dl-history: success true': (r) => JSON.parse(r.body).success === true,
    });
    sleep(1);
  });
}

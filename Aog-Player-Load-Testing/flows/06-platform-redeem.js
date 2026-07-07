// ===========================================================
// AOG Player Load Test — Platform Redeem (4 APIs)
// ===========================================================
// Run: k6 run -e BASE_URL=http://localhost:5001/api flows/06-platform-redeem.js
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
  // 1. GET /platform/redeem/info
  // ---------------------------------------------------------
  group('Platform Redeem — Get Info', () => {
    const res = http.get(`${BASE_URL}/platform/redeem/info`, {
      headers,
      tags: { name: 'GET /platform/redeem/info' },
    });
    check(res, {
      'redeem-info: status 200': (r) => r.status === 200,
      'redeem-info: success true': (r) => JSON.parse(r.body).success === true,
    });
    sleep(1);
  });

  // ---------------------------------------------------------
  // 2. POST /platform/redeem/submit — create a request
  // ---------------------------------------------------------
  let redeemRequestId = null;

  group('Platform Redeem — Submit Request', () => {
    const payload = JSON.stringify({
      platformName: 'Test Platform',
      scAmount: 10,
    });
    const res = http.post(`${BASE_URL}/platform/redeem/submit`, payload, {
      headers,
      tags: { name: 'POST /platform/redeem/submit' },
    });
    check(res, {
      'redeem-submit: status 200 or 400': (r) => r.status === 200 || r.status === 400,
      'redeem-submit: has success field': (r) => JSON.parse(r.body).success !== undefined,
    });

    if (res.status === 200) {
      try {
        const body = JSON.parse(res.body);
        redeemRequestId = body.data?.id || body.data?.requestId || null;
      } catch {
        // ignore parse errors
      }
    }
    sleep(2);
  });

  // ---------------------------------------------------------
  // 3. PUT /platform/redeem/:id/cancel — cancel the request
  // ---------------------------------------------------------
  group('Platform Redeem — Cancel Request', () => {
    if (!redeemRequestId) {
      console.log('Skipping cancel — no redeem request ID available');
      return;
    }
    const payload = JSON.stringify({ reason: 'Load test cancellation' });
    const res = http.put(`${BASE_URL}/platform/redeem/${redeemRequestId}/cancel`, payload, {
      headers,
      tags: { name: 'PUT /platform/redeem/:id/cancel' },
    });
    check(res, {
      'redeem-cancel: status 200 or 400': (r) => r.status === 200 || r.status === 400,
      'redeem-cancel: has success field': (r) => JSON.parse(r.body).success !== undefined,
    });
    sleep(1);
  });

  // ---------------------------------------------------------
  // 4. GET /platform/redeem/history
  // ---------------------------------------------------------
  group('Platform Redeem — History', () => {
    const res = http.get(`${BASE_URL}/platform/redeem/history?page=1&limit=10&status=`, {
      headers,
      tags: { name: 'GET /platform/redeem/history' },
    });
    check(res, {
      'redeem-history: status 200': (r) => r.status === 200,
      'redeem-history: success true': (r) => JSON.parse(r.body).success === true,
    });
    sleep(1);
  });
}

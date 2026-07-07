// ===========================================================
// AOG Player Load Test — Platform Topup (5 APIs)
// ===========================================================
// Run: k6 run -e BASE_URL=http://localhost:5001/api flows/05-platform-topup.js
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
  // 1. GET /platform/platforms
  // ---------------------------------------------------------
  group('Platform Topup — List Platforms', () => {
    const res = http.get(`${BASE_URL}/platform/platforms`, {
      headers,
      tags: { name: 'GET /platform/platforms' },
    });
    check(res, {
      'platforms: status 200': (r) => r.status === 200,
      'platforms: success true': (r) => JSON.parse(r.body).success === true,
    });
    sleep(1);
  });

  // ---------------------------------------------------------
  // 2. GET /platform/topup/info
  // ---------------------------------------------------------
  group('Platform Topup — Get Info', () => {
    const res = http.get(`${BASE_URL}/platform/topup/info`, {
      headers,
      tags: { name: 'GET /platform/topup/info' },
    });
    check(res, {
      'topup-info: status 200': (r) => r.status === 200,
      'topup-info: success true': (r) => JSON.parse(r.body).success === true,
    });
    sleep(1);
  });

  // ---------------------------------------------------------
  // 3. POST /platform/topup/submit — create a request
  // ---------------------------------------------------------
  let topupRequestId = null;

  group('Platform Topup — Submit Request', () => {
    const payload = JSON.stringify({
      platformName: 'Test Platform',
      scAmount: 10,
    });
    const res = http.post(`${BASE_URL}/platform/topup/submit`, payload, {
      headers,
      tags: { name: 'POST /platform/topup/submit' },
    });
    check(res, {
      'topup-submit: status 200 or 400': (r) => r.status === 200 || r.status === 400,
      'topup-submit: has success field': (r) => JSON.parse(r.body).success !== undefined,
    });

    if (res.status === 200) {
      try {
        const body = JSON.parse(res.body);
        topupRequestId = body.data?.id || body.data?.requestId || null;
      } catch {
        // ignore parse errors
      }
    }
    sleep(2);
  });

  // ---------------------------------------------------------
  // 4. PUT /platform/topup/:id/cancel — cancel the request we just created
  // ---------------------------------------------------------
  group('Platform Topup — Cancel Request', () => {
    if (!topupRequestId) {
      console.log('Skipping cancel — no topup request ID available');
      return;
    }
    const payload = JSON.stringify({ reason: 'Load test cancellation' });
    const res = http.put(`${BASE_URL}/platform/topup/${topupRequestId}/cancel`, payload, {
      headers,
      tags: { name: 'PUT /platform/topup/:id/cancel' },
    });
    check(res, {
      'topup-cancel: status 200 or 400': (r) => r.status === 200 || r.status === 400,
      'topup-cancel: has success field': (r) => JSON.parse(r.body).success !== undefined,
    });
    sleep(1);
  });

  // ---------------------------------------------------------
  // 5. GET /platform/topup/history
  // ---------------------------------------------------------
  group('Platform Topup — History', () => {
    const res = http.get(`${BASE_URL}/platform/topup/history?page=1&limit=10&status=`, {
      headers,
      tags: { name: 'GET /platform/topup/history' },
    });
    check(res, {
      'topup-history: status 200': (r) => r.status === 200,
      'topup-history: success true': (r) => JSON.parse(r.body).success === true,
    });
    sleep(1);
  });
}

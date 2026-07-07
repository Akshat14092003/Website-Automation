// ===========================================================
// AOG Player Load Test — SEON IDV (3 APIs)
// ===========================================================
// Run: k6 run -e BASE_URL=http://localhost:5001/api flows/08-seon-idv.js
// ===========================================================
// Note: SEON endpoints hit external IDV service. They will likely fail
// in load test env. We still include them to test backend validation
// and DB write performance.
// ===========================================================
import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { BASE_URL, THRESHOLDS, getStages, authHeaders } from '../config.js';
import { getAuth } from '../helpers/auth.js';
export { handleSummary } from '../helpers/report.js';

export const options = {
  stages: getStages(),
  thresholds: {
    http_req_duration: ['p(95)<1000', 'p(99)<2000'], // relaxed — external API
    http_req_failed: ['rate<0.50'], // high failure expected
  },
};

export default function () {
  const { token } = getAuth();
  if (!token) return;
  const headers = authHeaders(token);

  // ---------------------------------------------------------
  // 1. POST /seon/create-session
  // ---------------------------------------------------------
  group('SEON — Create Session', () => {
    const res = http.post(`${BASE_URL}/seon/create-session`, null, {
      headers,
      tags: { name: 'POST /seon/create-session' },
    });
    check(res, {
      'seon-create: responded': (r) => r.status > 0,
      'seon-create: has body': (r) => r.body && r.body.length > 0,
    });
    sleep(2);
  });

  // ---------------------------------------------------------
  // 2. POST /seon/complete-session
  // ---------------------------------------------------------
  group('SEON — Complete Session', () => {
    const res = http.post(`${BASE_URL}/seon/complete-session`, null, {
      headers,
      tags: { name: 'POST /seon/complete-session' },
    });
    check(res, {
      'seon-complete: responded': (r) => r.status > 0,
      'seon-complete: has body': (r) => r.body && r.body.length > 0,
    });
    sleep(2);
  });

  // ---------------------------------------------------------
  // 3. GET /seon/status
  // ---------------------------------------------------------
  group('SEON — Check Status', () => {
    const res = http.get(`${BASE_URL}/seon/status`, {
      headers,
      tags: { name: 'GET /seon/status' },
    });
    check(res, {
      'seon-status: responded': (r) => r.status > 0,
      'seon-status: has success field': (r) => {
        try {
          return JSON.parse(r.body).success !== undefined;
        } catch {
          return false;
        }
      },
    });
    sleep(1);
  });
}

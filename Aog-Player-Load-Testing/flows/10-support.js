// ===========================================================
// AOG Player Load Test — Support Tickets (3 APIs)
// ===========================================================
// Run: k6 run -e BASE_URL=http://localhost:5001/api flows/10-support.js
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
  // 1. GET /support/summary
  // ---------------------------------------------------------
  group('Support — Summary', () => {
    const res = http.get(`${BASE_URL}/support/summary`, {
      headers,
      tags: { name: 'GET /support/summary' },
    });
    check(res, {
      'support-summary: status 200': (r) => r.status === 200,
      'support-summary: success true': (r) => JSON.parse(r.body).success === true,
    });
    sleep(1);
  });

  // ---------------------------------------------------------
  // 2. GET /support/tickets
  // ---------------------------------------------------------
  group('Support — List Tickets', () => {
    const res = http.get(`${BASE_URL}/support/tickets?page=1&limit=10`, {
      headers,
      tags: { name: 'GET /support/tickets' },
    });
    check(res, {
      'support-list: status 200': (r) => r.status === 200,
      'support-list: success true': (r) => JSON.parse(r.body).success === true,
    });
    sleep(1);
  });

  // ---------------------------------------------------------
  // 3. POST /support/tickets — create a ticket
  // ---------------------------------------------------------
  group('Support — Create Ticket', () => {
    const departments = ['TECHNICAL', 'DISPATCH', 'FINANCE', 'OTHER'];
    const dept = departments[__VU % departments.length];

    const payload = JSON.stringify({
      title: `Load Test Ticket VU${__VU} Iter${__ITER}`,
      department: dept,
      comment: `This is an automated load test support ticket created by VU ${__VU} during iteration ${__ITER}. Please ignore this ticket.`,
    });
    const res = http.post(`${BASE_URL}/support/tickets`, payload, {
      headers,
      tags: { name: 'POST /support/tickets' },
    });
    check(res, {
      'support-create: status 200 or 201': (r) => r.status === 200 || r.status === 201,
      'support-create: has success field': (r) => JSON.parse(r.body).success !== undefined,
    });
    sleep(2);
  });
}

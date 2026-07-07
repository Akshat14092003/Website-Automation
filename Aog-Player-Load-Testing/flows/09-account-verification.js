// ===========================================================
// AOG Player Load Test — Account Verification (3 APIs)
// ===========================================================
// Run: k6 run -e BASE_URL=http://localhost:5001/api flows/09-account-verification.js
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
  const { token, userData } = getAuth();
  if (!token) return;
  const headers = authHeaders(token);

  // ---------------------------------------------------------
  // 1. GET /verification/info
  // ---------------------------------------------------------
  group('Account Verification — Get Info', () => {
    const res = http.get(`${BASE_URL}/verification/info`, {
      headers,
      tags: { name: 'GET /verification/info' },
    });
    check(res, {
      'ver-info: status 200': (r) => r.status === 200,
      'ver-info: has success field': (r) => JSON.parse(r.body).success !== undefined,
    });
    sleep(1);
  });

  // ---------------------------------------------------------
  // 2. POST /verification/save
  // ---------------------------------------------------------
  group('Account Verification — Save Info', () => {
    const payload = JSON.stringify({
      firstName: 'Load',
      lastName: `Tester${__VU}`,
      dateOfBirth: '1990-01-15',
      address: `${100 + __VU} Test Street`,
      addressLine2: `Apt ${__VU}`,
      city: 'Las Vegas',
      state: 'NV',
      zipCode: '89101',
      country: 'US',
    });
    const res = http.post(`${BASE_URL}/verification/save`, payload, {
      headers,
      tags: { name: 'POST /verification/save' },
    });
    check(res, {
      'ver-save: status 200 or 400': (r) => r.status === 200 || r.status === 400,
      'ver-save: has success field': (r) => JSON.parse(r.body).success !== undefined,
    });
    sleep(2);
  });

  // ---------------------------------------------------------
  // 3. PUT /verification/status
  // ---------------------------------------------------------
  group('Account Verification — Update Status', () => {
    const memberId = userData?.member_id || userData?.memberId || 'TESTMEMBER01';
    const payload = JSON.stringify({
      memberId: memberId,
      status: 'pending',
    });
    const res = http.put(`${BASE_URL}/verification/status`, payload, {
      headers,
      tags: { name: 'PUT /verification/status' },
    });
    check(res, {
      'ver-update: status 200 or 400 or 403': (r) =>
        r.status === 200 || r.status === 400 || r.status === 403,
      'ver-update: has success field': (r) => JSON.parse(r.body).success !== undefined,
    });
    sleep(1);
  });
}

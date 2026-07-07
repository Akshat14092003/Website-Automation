// ===========================================================
// AOG Player Load Test — Address Validation (2 APIs)
// ===========================================================
// Run: k6 run -e BASE_URL=http://localhost:5001/api flows/11-address-validation.js
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
  // 1. POST /address/validate
  // ---------------------------------------------------------
  group('Address — Validate Full Address', () => {
    const payload = JSON.stringify({
      streetAddress: `${100 + __VU} Main Street`,
      secondaryAddress: `Suite ${__VU}`,
      city: 'Las Vegas',
      state: 'NV',
      zipCode: '89101',
    });
    const res = http.post(`${BASE_URL}/address/validate`, payload, {
      headers,
      tags: { name: 'POST /address/validate' },
    });
    check(res, {
      'addr-validate: responded': (r) => r.status > 0,
      'addr-validate: has success field': (r) => JSON.parse(r.body).success !== undefined,
    });
    sleep(2);
  });

  // ---------------------------------------------------------
  // 2. POST /address/validate-zip
  // ---------------------------------------------------------
  group('Address — Validate ZIP Code', () => {
    const zips = ['89101', '10001', '90210', '60601', '33101'];
    const zip = zips[__VU % zips.length];

    const payload = JSON.stringify({ zipCode: zip });
    const res = http.post(`${BASE_URL}/address/validate-zip`, payload, {
      headers,
      tags: { name: 'POST /address/validate-zip' },
    });
    check(res, {
      'zip-validate: responded': (r) => r.status > 0,
      'zip-validate: has success field': (r) => JSON.parse(r.body).success !== undefined,
    });
    sleep(1);
  });
}

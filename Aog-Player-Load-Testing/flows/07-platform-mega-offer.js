// ===========================================================
// AOG Player Load Test — Platform Mega Offer (3 APIs)
// ===========================================================
// Run: k6 run -e BASE_URL=http://localhost:5001/api flows/07-platform-mega-offer.js
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
  // 1. GET /platform/mega-offer/eligibility
  // ---------------------------------------------------------
  group('Mega Offer — Check Eligibility', () => {
    const res = http.get(`${BASE_URL}/platform/mega-offer/eligibility`, {
      headers,
      tags: { name: 'GET /platform/mega-offer/eligibility' },
    });
    check(res, {
      'mega-elig: status 200': (r) => r.status === 200,
      'mega-elig: has success field': (r) => JSON.parse(r.body).success !== undefined,
    });
    sleep(1);
  });

  // ---------------------------------------------------------
  // 2. POST /platform/mega-offer/dismiss
  // ---------------------------------------------------------
  group('Mega Offer — Dismiss', () => {
    const res = http.post(`${BASE_URL}/platform/mega-offer/dismiss`, null, {
      headers,
      tags: { name: 'POST /platform/mega-offer/dismiss' },
    });
    check(res, {
      'mega-dismiss: status 200 or 400': (r) => r.status === 200 || r.status === 400,
      'mega-dismiss: has success field': (r) => JSON.parse(r.body).success !== undefined,
    });
    sleep(2);
  });

  // ---------------------------------------------------------
  // 3. POST /platform/mega-offer/claim
  // ---------------------------------------------------------
  group('Mega Offer — Claim', () => {
    const res = http.post(`${BASE_URL}/platform/mega-offer/claim`, null, {
      headers,
      tags: { name: 'POST /platform/mega-offer/claim' },
    });
    check(res, {
      'mega-claim: status 200 or 400': (r) => r.status === 200 || r.status === 400,
      'mega-claim: has success field': (r) => JSON.parse(r.body).success !== undefined,
    });
    sleep(2);
  });
}

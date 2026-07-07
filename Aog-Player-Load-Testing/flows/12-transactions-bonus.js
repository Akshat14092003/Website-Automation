// ===========================================================
// AOG Player Load Test — Transactions & Bonus History (2 APIs)
// ===========================================================
// Run: k6 run -e BASE_URL=http://localhost:5001/api flows/12-transactions-bonus.js
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
  // 1. GET /transactions/history
  // ---------------------------------------------------------
  group('Transactions — History', () => {
    const res = http.get(
      `${BASE_URL}/transactions/history?page=1&limit=10&category=&currency=&type=`,
      {
        headers,
        tags: { name: 'GET /transactions/history' },
      },
    );
    check(res, {
      'txn-history: status 200': (r) => r.status === 200,
      'txn-history: success true': (r) => JSON.parse(r.body).success === true,
    });
    sleep(1);
  });

  // ---------------------------------------------------------
  // 2. GET /engagement/bonus/history
  // ---------------------------------------------------------
  group('Bonus — History', () => {
    const res = http.get(`${BASE_URL}/engagement/bonus/history?page=1&limit=10`, {
      headers,
      tags: { name: 'GET /engagement/bonus/history' },
    });
    check(res, {
      'bonus-history: status 200': (r) => r.status === 200,
      'bonus-history: success true': (r) => JSON.parse(r.body).success === true,
    });
    sleep(1);
  });
}

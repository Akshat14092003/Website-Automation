// ===========================================================
// AOG Player Load Test — Engagement: Verification & KYC (6 APIs)
// ===========================================================
// Run: k6 run -e BASE_URL=http://localhost:5001/api flows/02-engagement-verification.js
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
  // 1. GET /engagement/verification/status
  // ---------------------------------------------------------
  group('Verification — Get Status', () => {
    const res = http.get(`${BASE_URL}/engagement/verification/status`, {
      headers,
      tags: { name: 'GET /engagement/verification/status' },
    });
    check(res, {
      'ver-status: status 200': (r) => r.status === 200,
      'ver-status: success true': (r) => JSON.parse(r.body).success === true,
    });
    sleep(1);
  });

  // ---------------------------------------------------------
  // 2. POST /engagement/verification/claim/:step (email)
  // ---------------------------------------------------------
  group('Verification — Claim Email Step', () => {
    const res = http.post(`${BASE_URL}/engagement/verification/claim/email`, null, {
      headers,
      tags: { name: 'POST /engagement/verification/claim/email' },
    });
    check(res, {
      'claim-email: status 200 or 400': (r) => r.status === 200 || r.status === 400,
      'claim-email: has success field': (r) => JSON.parse(r.body).success !== undefined,
    });
    sleep(2);
  });

  // ---------------------------------------------------------
  // 3. POST /engagement/verification/phone/send-otp
  //    (hits Plivo — will fail in load test, testing backend validation)
  // ---------------------------------------------------------
  group('Verification — Phone Send OTP', () => {
    const payload = JSON.stringify({
      phone: `+1555${String(__VU).padStart(3, '0')}${String(__ITER).padStart(4, '0')}`,
    });
    const res = http.post(`${BASE_URL}/engagement/verification/phone/send-otp`, payload, {
      headers,
      tags: { name: 'POST /engagement/verification/phone/send-otp' },
    });
    check(res, {
      'send-otp: responded': (r) => r.status > 0,
      'send-otp: has success field': (r) => JSON.parse(r.body).success !== undefined,
    });
    sleep(2);
  });

  // ---------------------------------------------------------
  // 4. POST /engagement/verification/phone/verify
  //    (will fail — testing backend validation path)
  // ---------------------------------------------------------
  group('Verification — Phone Verify OTP', () => {
    const payload = JSON.stringify({
      phone: '+15551234567',
      otp: '123456',
    });
    const res = http.post(`${BASE_URL}/engagement/verification/phone/verify`, payload, {
      headers,
      tags: { name: 'POST /engagement/verification/phone/verify' },
    });
    check(res, {
      'verify-otp: responded': (r) => r.status > 0,
      'verify-otp: has success field': (r) => JSON.parse(r.body).success !== undefined,
    });
    sleep(2);
  });

  // ---------------------------------------------------------
  // 5. POST /engagement/verification/kyc/upload
  //    (multipart/form-data with dummy file)
  // ---------------------------------------------------------
  group('Verification — KYC Upload', () => {
    const dummyFile = http.file(
      open('../helpers/auth.js', 'b'), // use any small file as dummy
      'test-document.pdf',
      'application/pdf',
    );
    const res = http.post(
      `${BASE_URL}/engagement/verification/kyc/upload`,
      { docType: 'passport', file: dummyFile },
      {
        headers: { Authorization: `Bearer ${data.token}` },
        tags: { name: 'POST /engagement/verification/kyc/upload' },
      },
    );
    check(res, {
      'kyc-upload: responded': (r) => r.status > 0,
      'kyc-upload: has success field': (r) => {
        try {
          return JSON.parse(r.body).success !== undefined;
        } catch {
          return false;
        }
      },
    });
    sleep(2);
  });

  // ---------------------------------------------------------
  // 6. GET /engagement/verification/kyc/status
  // ---------------------------------------------------------
  group('Verification — KYC Status', () => {
    const res = http.get(`${BASE_URL}/engagement/verification/kyc/status`, {
      headers,
      tags: { name: 'GET /engagement/verification/kyc/status' },
    });
    check(res, {
      'kyc-status: status 200': (r) => r.status === 200,
      'kyc-status: has success field': (r) => JSON.parse(r.body).success !== undefined,
    });
    sleep(1);
  });
}

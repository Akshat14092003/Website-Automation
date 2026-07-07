// ===========================================================
// Player Load Testing — Configuration
// ===========================================================
// Usage: k6 run flows/01-redemptions.js
// Set BASE_URL env var to point to your API:
//   k6 run -e BASE_URL=https://your-api.example.com/api flows/01-redemptions.js
// ===========================================================

export const BASE_URL = __ENV.BASE_URL || 'https://your-api.example.com/api';

// -----------------------------------------------------------
// Test Users Pool
// Each VU gets a unique user — no session conflicts.
// Configure USER_START, USER_END, and PASSWORD to match
// your QA account pool, or override via env vars.
// -----------------------------------------------------------
const PASSWORD = __ENV.TEST_PASSWORD || 'YourTestPassword123!';
const USER_START = parseInt(__ENV.USER_START || '1');
const USER_END = parseInt(__ENV.USER_END || '100');
const USER_EMAIL_DOMAIN = __ENV.USER_EMAIL_DOMAIN || 'example.com';
const USER_PREFIX = __ENV.USER_PREFIX || 'testuser';

export const TEST_USERS = [];
for (let i = USER_START; i <= USER_END; i++) {
  TEST_USERS.push({ name: `${USER_PREFIX}${i}@${USER_EMAIL_DOMAIN}`, pass: PASSWORD });
}

// -----------------------------------------------------------
// Helper: get a unique test user per VU
// -----------------------------------------------------------
export function getTestUser() {
  const index = (__VU - 1) % TEST_USERS.length;
  return TEST_USERS[index];
}

// -----------------------------------------------------------
// Default headers
// -----------------------------------------------------------
export const DEFAULT_HEADERS = {
  'Content-Type': 'application/json',
};

export function authHeaders(token) {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

// -----------------------------------------------------------
// Load Stage Presets
// -----------------------------------------------------------
export const STAGES = {
  smoke: [
    { duration: '1m', target: 5 },
    { duration: '2m', target: 5 },
  ],

  load: [
    { duration: '2m', target: 200 },    // ramp to 200
    { duration: '5m', target: 200 },    // hold 200
    { duration: '3m', target: 1000 },   // ramp to 1000
    { duration: '10m', target: 1000 },  // hold 1000
    { duration: '2m', target: 0 },      // ramp down
  ],

  stress: [
    { duration: '2m', target: 200 },    // ramp to 200
    { duration: '3m', target: 200 },    // hold 200
    { duration: '3m', target: 1000 },   // ramp to 1000
    { duration: '5m', target: 1000 },   // hold 1000
    { duration: '5m', target: 2000 },   // ramp to 2000
    { duration: '10m', target: 2000 },  // hold 2000
    { duration: '2m', target: 0 },      // ramp down
  ],

  spike: [
    { duration: '10s', target: 500 },   // instant spike to 500
    { duration: '1m30s', target: 500 }, // hold at 500
    { duration: '10s', target: 0 },     // drop to 0
    { duration: '1m', target: 0 },      // recovery period
    { duration: '10s', target: 500 },   // second spike
    { duration: '1m30s', target: 500 }, // hold again
    { duration: '20s', target: 0 },     // ramp down
  ],
};

// -----------------------------------------------------------
// Default Thresholds
// -----------------------------------------------------------
export const THRESHOLDS = {
  http_req_duration: ['p(95)<500', 'p(99)<1000'],
  http_req_failed: ['rate<0.01'],
};

// -----------------------------------------------------------
// Scenario selector via env var: k6 run -e STAGE=load ...
// -----------------------------------------------------------
export function getStages() {
  const stage = __ENV.STAGE || 'smoke';
  return STAGES[stage] || STAGES.smoke;
}

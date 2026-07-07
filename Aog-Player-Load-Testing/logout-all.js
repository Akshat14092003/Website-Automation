// ===========================================================
// AOG Player Load Testing — Logout All Test Users
// ===========================================================
// Runs after k6 test completes. Logs in and logs out every
// test user to clear all active sessions from the DB.
// ===========================================================
const https = require('https');
const http = require('http');

const BASE_URL = process.env.BASE_URL || 'https://your-api.example.com/api';
const PASSWORD = process.env.TEST_PASSWORD || 'YourTestPassword123!';
const USER_START = parseInt(process.env.USER_START || '1');
const USER_END = parseInt(process.env.USER_END || '100');
const USER_PREFIX = process.env.USER_PREFIX || 'testuser';
const USER_EMAIL_DOMAIN = process.env.USER_EMAIL_DOMAIN || 'example.com';
const BATCH_SIZE = 50; // concurrent logouts at a time

function makeRequest(method, url, body, headers) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const mod = parsed.protocol === 'https:' ? https : http;
    const opts = {
      hostname: parsed.hostname,
      port: parsed.port,
      path: parsed.pathname + parsed.search,
      method,
      headers: headers || {},
    };
    const req = mod.request(opts, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', (e) => resolve({ status: 0, body: e.message }));
    if (body) req.write(body);
    req.end();
  });
}

async function logoutUser(email) {
  // Login to get token
  const loginRes = await makeRequest(
    'POST',
    `${BASE_URL}/auth/login`,
    JSON.stringify({ name: email, pass: PASSWORD, forceLogin: true }),
    { 'Content-Type': 'application/json' },
  );

  if (loginRes.status !== 200) return false;

  let token;
  try {
    token = JSON.parse(loginRes.body).data.accessToken;
  } catch {
    return false;
  }

  // Logout
  await makeRequest('POST', `${BASE_URL}/auth/logout`, null, {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  });

  return true;
}

async function main() {
  // Read the latest result to find how many VUs were used
  const fs = require('fs');
  const path = require('path');
  const resultFile = path.join(__dirname, 'results', 'latest-result.json');

  let maxVUs = 0;
  if (fs.existsSync(resultFile)) {
    try {
      const data = JSON.parse(fs.readFileSync(resultFile, 'utf-8'));
      maxVUs = data.metrics?.vus_max?.values?.max || data.metrics?.vus_max?.values?.value || 0;
    } catch {
      maxVUs = 0;
    }
  }

  if (maxVUs === 0) {
    console.log('Could not determine VU count. Logging out all 1001 users...');
    maxVUs = USER_END - USER_START + 1;
  }

  // Only logout the users that were actually used
  const usersToLogout = Math.min(maxVUs, USER_END - USER_START + 1);
  console.log(`Logging out ${usersToLogout} test users...`);

  let loggedOut = 0;
  let failed = 0;

  // Process in batches
  for (let i = 0; i < usersToLogout; i += BATCH_SIZE) {
    const batch = [];
    for (let j = i; j < Math.min(i + BATCH_SIZE, usersToLogout); j++) {
      const email = `${USER_PREFIX}${USER_START + j}@${USER_EMAIL_DOMAIN}`;
      batch.push(logoutUser(email));
    }
    const results = await Promise.all(batch);
    loggedOut += results.filter((r) => r).length;
    failed += results.filter((r) => !r).length;

    // Progress
    const done = Math.min(i + BATCH_SIZE, usersToLogout);
    process.stdout.write(`\r  Progress: ${done}/${usersToLogout} (${loggedOut} logged out, ${failed} skipped)`);
  }

  console.log(`\n  Cleanup complete: ${loggedOut} users logged out, ${failed} skipped.`);
}

main().catch(console.error);

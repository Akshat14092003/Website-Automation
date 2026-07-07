// ===========================================================
// AOG Player Load Testing — Auth Helper
// ===========================================================
// Each VU gets a unique user (1001 users available).
// Token is cached — login happens only once per VU.
// ===========================================================
import http from 'k6/http';
import { check } from 'k6';
import { BASE_URL, DEFAULT_HEADERS, getTestUser } from '../config.js';

// Per-VU cache — login once, reuse for all iterations
let _cachedAuth = null;

export function getAuth() {
  if (_cachedAuth) return _cachedAuth;
  _cachedAuth = login();
  return _cachedAuth;
}

export function logout() {
  if (!_cachedAuth || !_cachedAuth.token) return;
  http.post(`${BASE_URL}/auth/logout`, null, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${_cachedAuth.token}`,
    },
    tags: { name: 'logout' },
  });
  _cachedAuth = null;
}

export function login(userOverride) {
  const user = userOverride || getTestUser();

  const payload = JSON.stringify({
    name: user.name,
    pass: user.pass,
    forceLogin: true,
  });

  const res = http.post(`${BASE_URL}/auth/login`, payload, {
    headers: DEFAULT_HEADERS,
    tags: { name: 'login' },
  });

  const success = check(res, {
    'login: status 200': (r) => r.status === 200,
    'login: has accessToken': (r) => {
      try {
        return JSON.parse(r.body).data.accessToken !== undefined;
      } catch {
        return false;
      }
    },
  });

  if (!success) {
    console.error(`Login failed for ${user.name}: ${res.status}`);
    return { token: null, userData: null };
  }

  const body = JSON.parse(res.body);
  return {
    token: body.data.accessToken,
    userData: body.data.userData,
  };
}

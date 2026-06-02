// Shared API helpers used by every k6 script in this directory.
// Centralized so the URL pattern + headers stay consistent and so changes
// to the wire format only touch one file.

import http from 'k6/http';
import { check, fail } from 'k6';

export const BASE = __ENV.BAKERIO_BASE_URL || 'http://localhost:8080';
export const PASSWORD = __ENV.BAKERIO_PASSWORD || '123456';

// Named demo customers seeded by seedExtraCustomers in cmd/server/seed_demo.go.
// VUs cycle through these so we don't hammer the same user's auth path.
const NAMED_CUSTOMERS = [
  'customer1@bakerio.com', 'customer2@bakerio.com', 'customer3@bakerio.com',
  'alice@bakerio.com', 'bob@bakerio.com', 'charlie@bakerio.com',
  'diana@bakerio.com', 'ethan@bakerio.com', 'fiona@bakerio.com',
  'george@bakerio.com', 'hannah@bakerio.com', 'ivan@bakerio.com',
  'julia@bakerio.com', 'kevin@bakerio.com', 'laura@bakerio.com',
  'mike@bakerio.com', 'nora@bakerio.com', 'oscar@bakerio.com',
  'paula@bakerio.com', 'quincy@bakerio.com', 'rachel@bakerio.com',
  'simon@bakerio.com', 'tina@bakerio.com',
];

// For stress runs, set LOAD_CUSTOMERS=N to spread VUs across the N synthetic
// load-test accounts (loaduser1..N@bakerio.com) created by seedLoadTestCustomers.
// This avoids re-using the 23 named accounts when VU counts get large. When
// unset (or 0), we fall back to the named demo pool above. (Not K6_*-prefixed
// on purpose — that prefix is reserved by k6 for native options.)
const LOAD_CUSTOMERS = Number(__ENV.LOAD_CUSTOMERS || 0);
export const CUSTOMERS = LOAD_CUSTOMERS > 0
  ? Array.from({ length: LOAD_CUSTOMERS }, (_, i) => `loaduser${i + 1}@bakerio.com`)
  : NAMED_CUSTOMERS;

// Q1 shipping coords — close to D1 Saigon Square so every test ships at
// the cheapest tier unless the script overrides.
export const Q1_LAT = 10.7747;
export const Q1_LNG = 106.7025;

export function jsonHeaders(token) {
  const h = { 'Content-Type': 'application/json' };
  if (token) h['Authorization'] = `Bearer ${token}`;
  return h;
}

export function login(email, password = PASSWORD) {
  const r = http.post(
    `${BASE}/api/v1/auth/login`,
    JSON.stringify({ email, password }),
    { headers: jsonHeaders() },
  );
  if (r.status !== 200) {
    fail(`login failed for ${email}: ${r.status} ${r.body}`);
  }
  return r.json('data.access_token');
}

// Setup-time fetcher: pull product list once + branch list once, return a
// compact map by name so test scripts can look up IDs without hardcoding.
// Both endpoints are public — no auth needed here.
export function loadCatalog() {
  const products = http.get(`${BASE}/api/v1/products?size=100`);
  const branches = http.get(`${BASE}/api/v1/branch?size=50`);
  if (products.status !== 200) fail(`list products failed: ${products.status}`);
  if (branches.status !== 200) fail(`list branches failed: ${branches.status}`);

  const pByName = {};
  for (const p of products.json('data.items') || []) pByName[p.name] = p.id;
  const bByName = {};
  for (const b of branches.json('data.items') || []) bByName[b.name] = b.id;
  return { products: pByName, branches: bByName };
}

export function findBranches(token, items, lat = Q1_LAT, lng = Q1_LNG) {
  return http.post(
    `${BASE}/api/v1/orders/find-branches`,
    JSON.stringify({
      shipping_address: 'k6 test',
      shipping_latitude: lat,
      shipping_longitude: lng,
      items,
    }),
    { headers: jsonHeaders(token) },
  );
}

export function selectBranch(token, branchId, items, lat = Q1_LAT, lng = Q1_LNG) {
  return http.post(
    `${BASE}/api/v1/orders/select-branch`,
    JSON.stringify({
      branch_id: branchId,
      shipping_address: 'k6 test',
      shipping_latitude: lat,
      shipping_longitude: lng,
      items,
    }),
    { headers: jsonHeaders(token) },
  );
}

export function confirm(token, sessionId) {
  return http.post(
    `${BASE}/api/v1/orders/confirm`,
    JSON.stringify({ session_id: sessionId }),
    { headers: jsonHeaders(token) },
  );
}

// classifyConfirm — turns a confirm response into a tag so scripts can
// emit custom metrics without re-parsing JSON in every iteration.
export function classifyConfirm(r) {
  if (r.status === 201) return 'win';
  if (r.status === 410) return 'session_expired';
  if (r.status === 409) {
    const msg = r.json('error.message') || '';
    if (msg.includes('stock shifted')) return 'pre_check_caught';
    if (msg.includes('decrement') || msg.includes('rare race')) return 'update_caught';
    if (msg.includes('not eligible')) return 'branch_not_eligible';
    return 'conflict_other';
  }
  return `http_${r.status}`;
}

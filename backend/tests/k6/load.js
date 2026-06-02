// load.js — sustained, multi-stage ramped stress load on the full checkout
// flow. VUs each: login → find → select → confirm. Different VUs use different
// customers + a small spread of products so we exercise routing + locking
// under realistic mix.
//
// The scenario warms up, climbs, HOLDS at peak (K6_VUS) for K6_DURATION, then
// eases back down — so the peak-hold metrics reflect steady state.
//
//   docker compose -f deployments/docker-compose.yml --profile test run --rm k6 \
//     run /scripts/load.js
//   # or via make: make k6-load K6_VUS=200 K6_DURATION=1m K6_CUSTOMERS=500
//
// Env knobs (deliberately NOT K6_*-prefixed — see note by the consts below):
//   LOAD_VUS       peak VUs (default 50)
//   LOAD_DURATION  peak-hold duration (default 30s)
//   LOAD_P95_MS    confirm p95 threshold ceiling in ms (default 500)
//   LOAD_CUSTOMERS use N synthetic loaduser{N} accounts instead of the 23 named
//                  ones — seed them first with SEED_LOAD_CUSTOMERS (see api.js)
//   PRODUCT_NAMES  comma-separated SKU mix to shop from
//
// The make targets expose these via the friendlier K6_VUS / K6_DURATION /
// K6_CUSTOMERS names and remap them to LOAD_* before invoking k6.

import { check, sleep } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';
import {
  loadCatalog,
  login,
  findBranches,
  selectBranch,
  confirm,
  classifyConfirm,
  CUSTOMERS,
} from './lib/api.js';

// NOTE: these use LOAD_* names, NOT K6_VUS / K6_DURATION. The latter are
// k6-reserved env vars — setting them makes k6 synthesize a flat "default"
// scenario and silently OVERRIDE the multi-stage `scenarios` block below.
const VUS = Number(__ENV.LOAD_VUS || 50);      // peak VUs (override e.g. LOAD_VUS=200)
const DURATION = __ENV.LOAD_DURATION || '30s'; // how long to HOLD at peak
const P95_MS = Number(__ENV.LOAD_P95_MS || 500); // confirm p95 ceiling (ms)

// quarter/half of peak, never below 1 — used for the ramp shoulders.
const Q = Math.max(1, Math.ceil(VUS / 4));
const H = Math.max(1, Math.ceil(VUS / 2));

// Default product mix — broad enough that branches don't all serialize on
// the same SKU lock, but small enough that some natural contention occurs.
const PRODUCT_NAMES = (__ENV.PRODUCT_NAMES ||
  'Baguette,Croissant,Latte,Iced Tea,Sugar Cookie,Espresso,Glazed Donut')
  .split(',').map(s => s.trim());

// Custom metrics — show up in the k6 summary so success/failure mix is
// visible without grepping per-request logs.
const winCounter = new Counter('confirm_win');
const preCheckCounter = new Counter('confirm_pre_check_caught');
const updateCounter = new Counter('confirm_update_caught');
const otherCounter = new Counter('confirm_other');
const winRate = new Rate('confirm_win_rate');
const confirmDuration = new Trend('confirm_duration_ms');

export const options = {
  scenarios: {
    checkout: {
      executor: 'ramping-vus',
      startVUs: 1,
      // Multi-stage stress profile: warm up, climb, HOLD at peak for DURATION,
      // then ease back down. The shoulders let connection pools and caches
      // settle so the peak-hold numbers reflect steady state, not cold start.
      stages: [
        { duration: '10s',    target: Q   }, // warm-up
        { duration: '15s',    target: H   }, // climb
        { duration: '15s',    target: VUS }, // ramp to peak
        { duration: DURATION, target: VUS }, // HOLD at peak
        { duration: '15s',    target: H   }, // ease off
        { duration: '10s',    target: 0   }, // cool-down
      ],
      gracefulRampDown: '10s',
    },
  },
  thresholds: {
    // 95th percentile of full-tx confirm under P95_MS. Default 500ms leaves
    // headroom for the lock-contended path under heavy stress; tighten via
    // K6_P95_MS for lighter runs.
    'confirm_duration_ms': [`p(95)<${P95_MS}`],
    // 50%+ of confirms should win even under contention — if we go below
    // that the routing is producing too much overlap on the same SKU.
    'confirm_win_rate': ['rate>0.50'],
    // 5xx is always a bug.
    'http_req_failed{type:server_error}': ['rate==0.0'],
  },
};

export function setup() {
  const catalog = loadCatalog();
  const productIds = PRODUCT_NAMES
    .map(n => ({ name: n, id: catalog.products[n] }))
    .filter(p => p.id);
  if (productIds.length === 0) {
    throw new Error(`no products from list ${PRODUCT_NAMES.join(',')} found in catalog`);
  }
  return { productIds };
}

// Each VU has a stable customer + token from setup time, so we're not
// re-authing on every iteration.
const vuState = { token: null, email: null };

export default function (data) {
  if (!vuState.token) {
    // Spread across the customer pool — modulo wraps for higher VU counts.
    // Set K6_CUSTOMERS so the pool is large enough that VUs rarely collide.
    vuState.email = CUSTOMERS[(__VU - 1) % CUSTOMERS.length];
    vuState.token = login(vuState.email);
  }

  // Pick 1–2 random products for this cart.
  const picks = [data.productIds[Math.floor(Math.random() * data.productIds.length)]];
  if (Math.random() < 0.5) {
    picks.push(data.productIds[Math.floor(Math.random() * data.productIds.length)]);
  }
  const items = picks.map(p => ({
    product_id: p.id,
    quantity: 1 + Math.floor(Math.random() * 3), // 1..3
  }));

  // 1. find branches
  const fb = findBranches(vuState.token, items);
  if (fb.status !== 200) {
    check(fb, { 'find-branches: 200': r => r.status === 200 });
    return;
  }
  const options = fb.json('data.options') || [];
  if (options.length === 0) {
    // stock shifted — try again next iteration
    return;
  }
  // Pick a random eligible branch (not always nearest, to spread load).
  const picked = options[Math.floor(Math.random() * options.length)];

  // 2. select branch
  const sb = selectBranch(vuState.token, picked.branch_id, items);
  if (sb.status !== 200) {
    // 409 here means our pick lost a race between find and select — fine, just skip.
    return;
  }
  const sessionId = sb.json('data.session_id');

  // 3. confirm
  const c = confirm(vuState.token, sessionId);
  const tag = classifyConfirm(c);
  confirmDuration.add(c.timings.duration);
  winRate.add(tag === 'win');
  switch (tag) {
    case 'win':              winCounter.add(1); break;
    case 'pre_check_caught': preCheckCounter.add(1); break;
    case 'update_caught':    updateCounter.add(1); break;
    default:                 otherCounter.add(1);
  }

  // Tiny pace — keeps a single VU from monopolizing CPU.
  sleep(0.05);
}

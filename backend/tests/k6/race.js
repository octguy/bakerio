// race.js — many concurrent confirms against a deliberately low stock to
// observe the atomic-UPDATE safety net. Pre-checks will mostly catch
// conflicts once the first commit lands, but a fraction will pass pre-check
// and be caught by the UPDATE's WHERE clause — that's the race we want to
// see.
//
// Before running:
//   make docker-psql
//   UPDATE product.branch_products SET quantity = 10
//   WHERE branch_id = (SELECT id FROM branch.branches WHERE name='District 4 — Khanh Hoi')
//     AND product_id = (SELECT id FROM product.products WHERE name='Tiramisu');
//
// Run:
//   docker compose -f deployments/docker-compose.yml --profile test run --rm k6 \
//     run /scripts/race.js
//
// Override knobs (the make target maps K6_VUS/K6_ITERATIONS → these RACE_* /
// LOAD_* names, because K6_VUS & K6_ITERATIONS are k6-reserved and would
// clobber the scenario):
//   RACE_VUS       = number of concurrent VUs (default 50)
//   RACE_ITERATIONS= total confirm attempts (default = RACE_VUS). Set higher to
//                    loop VUs for repeated contention rounds in one run.
//   LOAD_CUSTOMERS = use N synthetic loaduser{N} accounts instead of the named
//                    pool (seed them with SEED_LOAD_CUSTOMERS — see api.js)
//   PRODUCT_NAME   = SKU to hammer (default Tiramisu)
//   BRANCH_NAME    = branch to target (default District 4 — Khanh Hoi)
//   QTY_PER_ORDER  = each VU buys this many units (default 1)
//   EXPECTED_STOCK = expected stock at start, used to print expected wins (default 10)

import { Counter, Rate } from 'k6/metrics';
import {
  loadCatalog,
  login,
  selectBranch,
  confirm,
  classifyConfirm,
  CUSTOMERS,
} from './lib/api.js';

// NOTE: RACE_* names, NOT K6_VUS / K6_ITERATIONS — the latter are k6-reserved
// env vars that would override the shared-iterations scenario below.
const VUS = Number(__ENV.RACE_VUS || 50);
// ITERATIONS = total confirm attempts. Defaults to VUS (one burst, max
// simultaneity). Set RACE_ITERATIONS > VUS to keep VUs looping for repeated
// contention rounds against the same pinned stock in a single run.
const ITERATIONS = Number(__ENV.RACE_ITERATIONS || VUS);
const PRODUCT_NAME = __ENV.PRODUCT_NAME || 'Tiramisu';
const BRANCH_NAME = __ENV.BRANCH_NAME || 'District 4 — Khanh Hoi';
const QTY_PER_ORDER = Number(__ENV.QTY_PER_ORDER || 1);
const EXPECTED_STOCK = Number(__ENV.EXPECTED_STOCK || 10);

const winCounter = new Counter('confirm_win');
const preCheckCounter = new Counter('confirm_pre_check_caught');
const updateCounter = new Counter('confirm_update_caught');
const otherCounter = new Counter('confirm_other');
const winRate = new Rate('confirm_win_rate');

export const options = {
  scenarios: {
    rush: {
      // shared-iterations spawns VUS workers and shares ITERATIONS iterations
      // among them. With ITERATIONS == VUS each VU runs once and all start as
      // close to simultaneously as the executor allows — perfect for the
      // contention path. With ITERATIONS > VUS, VUs loop for more rounds.
      executor: 'shared-iterations',
      vus: VUS,
      iterations: ITERATIONS,
      maxDuration: '120s',
    },
  },
};

export function setup() {
  const catalog = loadCatalog();
  const productId = catalog.products[PRODUCT_NAME];
  const branchId = catalog.branches[BRANCH_NAME];
  if (!productId) throw new Error(`product not found: ${PRODUCT_NAME}`);
  if (!branchId) throw new Error(`branch not found: ${BRANCH_NAME}`);
  const winners = Math.min(Math.floor(EXPECTED_STOCK / QTY_PER_ORDER), ITERATIONS);
  console.log(
    `▶ race: ${VUS} VUs / ${ITERATIONS} attempts × ${QTY_PER_ORDER}u of ` +
    `"${PRODUCT_NAME}" at "${BRANCH_NAME}". ` +
    `Expected ~${winners} winners, ~${ITERATIONS - winners} STOCK_CONFLICTs.`,
  );
  return { productId, branchId };
}

const vuState = { token: null };

export default function (data) {
  if (!vuState.token) {
    vuState.token = login(CUSTOMERS[(__VU - 1) % CUSTOMERS.length]);
  }

  const items = [{ product_id: data.productId, quantity: QTY_PER_ORDER }];

  // 1. select branch — locks the quote into Redis.
  const sb = selectBranch(vuState.token, data.branchId, items);
  if (sb.status !== 200) {
    // 409 from select-branch — stock already gone by the time this VU
    // hit select. Counts toward pre_check_caught (server detected it
    // before session creation).
    preCheckCounter.add(1);
    winRate.add(false);
    return;
  }
  const sessionId = sb.json('data.session_id');

  // 2. confirm — atomic decrement + insert.
  const c = confirm(vuState.token, sessionId);
  const tag = classifyConfirm(c);
  winRate.add(tag === 'win');
  switch (tag) {
    case 'win':              winCounter.add(1); break;
    case 'pre_check_caught': preCheckCounter.add(1); break;
    case 'update_caught':    updateCounter.add(1); break;
    default:                 otherCounter.add(1);
  }
}

// metricCount safely pulls the .values.count off a metric without optional
// chaining (k6's bundled Babel doesn't support `?.`).
function metricCount(m) {
  if (!m || !m.values) return 0;
  return m.values.count || 0;
}

export function handleSummary(data) {
  const wins = metricCount(data.metrics.confirm_win);
  const pre = metricCount(data.metrics.confirm_pre_check_caught);
  const upd = metricCount(data.metrics.confirm_update_caught);
  const other = metricCount(data.metrics.confirm_other);
  const total = wins + pre + upd + other;
  console.log(`\n▶ race result: ${wins} WIN · ${pre} pre_check · ${upd} update · ${other} other · total ${total}`);
  return { stdout: '' }; // let k6's default table summary remain
}

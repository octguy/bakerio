// Audit §III: loyalty / crumbs — missing on backend. Mock added so the order
// profile screen, checkout discount, and tracking footer can show real-feeling values.

export type CrumbsTier = "Croissant" | "Sourdough" | "Pâtisserie";

export interface LoyaltyBalance {
  balance: number;
  asMoney: number;
  tier: CrumbsTier;
  toNextTier: number;
  nextTier: CrumbsTier | null;
  /** 0..1 — progress within current tier. */
  progress: number;
}

const TIERS: Array<{ name: CrumbsTier; threshold: number }> = [
  { name: "Croissant", threshold: 0 },
  { name: "Sourdough", threshold: 2000 },
  { name: "Pâtisserie", threshold: 5000 },
];

const STORAGE_KEY = "bakerio-mock-crumbs";

function readBalance(): number {
  if (typeof window !== "undefined" && window.localStorage) {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const n = Number(raw);
      if (Number.isFinite(n)) return n;
    }
  }
  return 1420; // matches design copy
}

function writeBalance(n: number) {
  if (typeof window !== "undefined" && window.localStorage) {
    localStorage.setItem(STORAGE_KEY, String(Math.max(0, n)));
  }
}

export async function getLoyalty(): Promise<LoyaltyBalance> {
  await new Promise((r) => setTimeout(r, 80));
  const balance = readBalance();

  // Find current + next tier
  let current = TIERS[0]!;
  let next: { name: CrumbsTier; threshold: number } | null = null;
  for (let i = 0; i < TIERS.length; i++) {
    const t = TIERS[i]!;
    if (balance >= t.threshold) {
      current = t;
      next = TIERS[i + 1] ?? null;
    }
  }
  const span = next ? next.threshold - current.threshold : 1;
  const progress = next ? Math.min(1, Math.max(0, (balance - current.threshold) / span)) : 1;

  return {
    balance,
    asMoney: balance * 50, // 50₫ per crumb
    tier: current.name,
    toNextTier: next ? next.threshold - balance : 0,
    nextTier: next?.name ?? null,
    progress,
  };
}

/** Returns crumbs earnable on this order subtotal (1 crumb / 1,000₫). */
export function crumbsEarnedFor(subtotalVnd: number): number {
  return Math.max(0, Math.floor(subtotalVnd / 1000));
}

/** Returns the max VND discount the user can redeem from their balance, capped at 20% of subtotal. */
export async function maxRedeemableFor(subtotalVnd: number): Promise<number> {
  const { balance, asMoney } = await getLoyalty();
  const cap = Math.floor(subtotalVnd * 0.2);
  return Math.min(cap, asMoney, balance * 50);
}

/** Persist a redemption. Returns new balance. */
export async function redeemCrumbs(amount: number): Promise<number> {
  await new Promise((r) => setTimeout(r, 100));
  const current = readBalance();
  const remaining = Math.max(0, current - amount);
  writeBalance(remaining);
  return remaining;
}

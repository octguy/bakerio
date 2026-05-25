// Audit §III: kitchen ticket model — missing on backend. Mock added so the
// admin Kitchen display has something real to render and progress against.

export type KitchenSeverity = "fresh" | "normal" | "warning" | "late";
export type KitchenStation = "Bread" | "Pastry" | "Coffee";
export type KitchenMode = "PU" | "DEL";

export interface KitchenItem {
  q: number;
  n: string;
  mod?: string;
  done?: boolean;
}

export interface KitchenTicket {
  id: string;
  mins: number;
  target: number;
  station: KitchenStation;
  cust: string;
  mode: KitchenMode;
  items: KitchenItem[];
  tag?: string;
  sev: KitchenSeverity;
}

const BASE: KitchenTicket[] = [
  {
    id: "11050", mins: 12, target: 18, station: "Bread", cust: "A. Vũ", mode: "PU",
    items: [
      { q: 6, n: "Croissant au beurre", mod: "warm" },
      { q: 2, n: "Cà phê sữa đá", mod: "less sweet" },
    ],
    sev: "normal",
  },
  {
    id: "11048", mins: 18, target: 15, station: "Bread", cust: "B. Sơn", mode: "PU",
    items: [
      { q: 4, n: "Bánh mì Sài Gòn", mod: "no chili" },
      { q: 1, n: "Sourdough loaf", mod: "sliced" },
    ],
    tag: "OVER 3M", sev: "late",
  },
  {
    id: "11049", mins: 14, target: 25, station: "Pastry", cust: "Ms. Hằng", mode: "DEL",
    items: [{ q: 1, n: "Bánh kem dâu (whole)", mod: '"happy birthday Mai"' }],
    tag: "VIP", sev: "warning",
  },
  {
    id: "11051", mins: 8, target: 15, station: "Bread", cust: "D. Linh", mode: "PU",
    items: [
      { q: 3, n: "Bánh mì Sài Gòn" },
      { q: 2, n: "Cà phê đen" },
    ],
    sev: "normal",
  },
  {
    id: "11052", mins: 5, target: 15, station: "Pastry", cust: "T. Hà", mode: "PU",
    items: [{ q: 4, n: "Pain au chocolat", mod: "warm" }],
    sev: "fresh",
  },
  {
    id: "11053", mins: 3, target: 20, station: "Bread", cust: "M. Thảo", mode: "DEL",
    items: [
      { q: 2, n: "Sourdough loaf" },
      { q: 1, n: "Tart Quýt Hồng" },
    ],
    sev: "fresh",
  },
];

function reseverity(t: KitchenTicket): KitchenTicket {
  let sev: KitchenSeverity = "fresh";
  if (t.tag === "VIP") sev = "warning";
  else if (t.mins > t.target) sev = "late";
  else if (t.mins > 5) sev = "normal";
  return { ...t, sev };
}

export async function getKitchenTickets(station?: KitchenStation): Promise<KitchenTicket[]> {
  await new Promise((r) => setTimeout(r, 120));
  const all = BASE.map(reseverity);
  return station ? all.filter((t) => t.station === station) : all;
}

export async function getKitchenCounts(): Promise<{
  queue: number;
  avgPrepLabel: string;
  late: number;
  byStation: Record<KitchenStation | "All", number>;
}> {
  await new Promise((r) => setTimeout(r, 60));
  const all = BASE.map(reseverity);
  const bread = all.filter((t) => t.station === "Bread").length;
  const pastry = all.filter((t) => t.station === "Pastry").length;
  const coffee = all.filter((t) => t.station === "Coffee").length;
  return {
    queue: all.length,
    avgPrepLabel: "11m 24s",
    late: all.filter((t) => t.sev === "late").length,
    byStation: { All: all.length, Bread: bread, Pastry: pastry, Coffee: coffee },
  };
}

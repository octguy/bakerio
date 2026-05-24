// Audit §III: inventory module — missing on backend. Mock added so the admin
// Inventory page and the dashboard's low-stock alert have something to render.

export type InventoryLevel = "critical" | "low" | "ok";

export interface InventoryItem {
  sku: string;
  name: string;
  group: "Flour" | "Dairy" | "Filling" | "Banh mi" | "Coffee" | "Other";
  unit: "kg" | "L" | "tray";
  stock: number;
  par: number;
  supplier: string;
  cost: number;
  lvl: InventoryLevel;
  updated: string;
}

const RAW: Omit<InventoryItem, "lvl">[] = [
  { sku: "FL-T55",   name: "Bột mì T55",                group: "Flour",   unit: "kg",   stock: 4,    par: 60, supplier: "Lê & Sons",   cost: 32000,  updated: "3m" },
  { sku: "FL-WHOLE", name: "Bột mì nguyên cám",         group: "Flour",   unit: "kg",   stock: 22,   par: 40, supplier: "Lê & Sons",   cost: 45000,  updated: "1h" },
  { sku: "BT-AOP",   name: "Bơ AOP Brittany",           group: "Dairy",   unit: "kg",   stock: 1.2,  par: 12, supplier: "Saigon Imp.", cost: 480000, updated: "32m" },
  { sku: "BT-PRES",  name: "Bơ President 82%",          group: "Dairy",   unit: "kg",   stock: 8.4,  par: 20, supplier: "Saigon Imp.", cost: 220000, updated: "2h" },
  { sku: "EG-M",     name: "Trứng gà ta",               group: "Dairy",   unit: "tray", stock: 28,   par: 24, supplier: "Long An Farm", cost: 65000,  updated: "4h" },
  { sku: "YE-FRESH", name: "Men tươi",                  group: "Other",   unit: "kg",   stock: 1.8,  par: 4,  supplier: "Saigon Imp.", cost: 120000, updated: "5h" },
  { sku: "SU-CAS",   name: "Đường tinh luyện",          group: "Other",   unit: "kg",   stock: 38,   par: 50, supplier: "Biên Hoà",    cost: 22000,  updated: "6h" },
  { sku: "CH-70",    name: "Chocolate Callebaut 70%",   group: "Filling", unit: "kg",   stock: 2.1,  par: 8,  supplier: "Saigon Imp.", cost: 380000, updated: "1d" },
  { sku: "PAT-H",    name: "Pâté house (made daily)",   group: "Banh mi", unit: "kg",   stock: 12,   par: 18, supplier: "In-house",    cost: 95000,  updated: "20m" },
  { sku: "CL-LA",    name: "Chả lụa Long An",           group: "Banh mi", unit: "kg",   stock: 5.4,  par: 10, supplier: "Trần family", cost: 180000, updated: "2h" },
  { sku: "CF-DL",    name: "Cà phê Đà Lạt single",      group: "Coffee",  unit: "kg",   stock: 14,   par: 16, supplier: "Đà Lạt Co.",  cost: 320000, updated: "1d" },
  { sku: "MK-DR",    name: "Sữa tươi (oat)",            group: "Coffee",  unit: "L",    stock: 22,   par: 40, supplier: "Vinamilk",    cost: 38000,  updated: "4h" },
];

function levelOf(stock: number, par: number): InventoryLevel {
  const pct = stock / par;
  if (pct < 0.15) return "critical";
  if (pct < 0.5) return "low";
  return "ok";
}

export const mockInventory: InventoryItem[] = RAW.map((r) => ({ ...r, lvl: levelOf(r.stock, r.par) }));

export async function getInventory(group?: InventoryItem["group"]): Promise<InventoryItem[]> {
  await new Promise((r) => setTimeout(r, 120));
  return group ? mockInventory.filter((i) => i.group === group) : mockInventory;
}

export async function getInventoryHealth(): Promise<{
  totalValue: number;
  itemsTracked: number;
  lowStock: number;
  critical: number;
}> {
  await new Promise((r) => setTimeout(r, 80));
  return {
    totalValue: mockInventory.reduce((s, i) => s + i.cost * i.stock, 0),
    itemsTracked: 84, // total across all branches per design copy
    lowStock: mockInventory.filter((i) => i.lvl === "low").length,
    critical: mockInventory.filter((i) => i.lvl === "critical").length,
  };
}

export function isBelowPar(item: InventoryItem): boolean {
  return item.lvl !== "ok";
}

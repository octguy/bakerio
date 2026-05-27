import type {
  Branch,
  Category,
  CreateOrderRequest,
  Order,
  OrderItem,
  Product,
} from "../types";

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ── Categories ─────────────────────────────────────────────
// Audit §III: design shows 8 categories, mock had 4. Grown to match.
export const mockCategories: Category[] = [
  { id: "cat-banhmi", name: "Bánh mì", slug: "banh-mi", sort_order: 1, is_active: true },
  { id: "cat-sourdough", name: "Sourdough", slug: "sourdough", sort_order: 2, is_active: true },
  { id: "cat-croissant", name: "Croissant", slug: "croissant", sort_order: 3, is_active: true },
  { id: "cat-pastry", name: "Pastry", slug: "pastry", sort_order: 4, is_active: true },
  { id: "cat-cake", name: "Cake", slug: "cake", sort_order: 5, is_active: true },
  { id: "cat-coffee", name: "Cà phê · Drinks", slug: "coffee", sort_order: 6, is_active: true },
  { id: "cat-seasonal", name: "Seasonal", slug: "seasonal", sort_order: 7, is_active: true },
  { id: "cat-gift", name: "Gift box", slug: "gift", sort_order: 8, is_active: true },
];

// Image library — bakery / Vietnamese pastry feel
const IMG = {
  banhmi: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=1400&q=85&auto=format",
  flour: "https://images.unsplash.com/photo-1568051243851-f9b136146e97?w=1200&q=85&auto=format",
  pastry: "https://images.unsplash.com/photo-1568827999250-3f6afff96e66?w=1200&q=85&auto=format",
  pastry2: "https://images.unsplash.com/photo-1488477181946-6428a0291777?w=1200&q=85&auto=format",
  tart: "https://images.unsplash.com/photo-1464195244916-405fa0a82545?w=1200&q=85&auto=format",
  cake: "https://images.unsplash.com/photo-1565958011703-44f9829ba187?w=1200&q=85&auto=format",
  cake2: "https://images.unsplash.com/photo-1551024601-bec78aea704b?w=1200&q=85&auto=format",
  coffee: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=1400&q=85&auto=format",
  loaves: "https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=1400&q=85&auto=format",
};

function imageObj(url: string, idx: number) {
  return [{ id: `img-${idx}`, url, is_primary: true, sort_order: 0 }];
}

// ── Products ───────────────────────────────────────────────
// Audit §III: swapped fixtures from English (Vanilla Sponge, Croissant) to
// Vietnamese names used in the design folio (Bánh mì Sài Gòn, Tart Quýt Hồng).
// Added optional `allergens` for the menu filter; field is ignored by backend.
export const mockProducts: Product[] = [
  { id: "p-bmi-1",  sku: "BMI-001",   name: "Bánh mì Sài Gòn",      slug: "banh-mi-sai-gon",      description: "Pâté · chả lụa · jambon · dưa leo. Baked five times daily.", base_price: 65000,  unit: "piece", is_active: true, category: mockCategories[0], images: imageObj(IMG.banhmi, 1),  tag: "★",   allergens: ["Gluten", "Dairy", "Eggs"],     created_at: "2024-01-01T00:00:00Z" },
  { id: "p-bmi-2",  sku: "BMI-002",   name: "Bánh mì heo quay",     slug: "banh-mi-heo-quay",     description: "Crackling roast pork, hoisin glaze.",                       base_price: 72000,  unit: "piece", is_active: true, category: mockCategories[0], images: imageObj(IMG.banhmi, 2),                allergens: ["Gluten"],                       created_at: "2024-01-01T00:00:00Z" },
  { id: "p-bmi-3",  sku: "BMI-003",   name: "Bánh mì chay",         slug: "banh-mi-chay",         description: "Vegan pâté, marinated mushroom.",                            base_price: 58000,  unit: "piece", is_active: true, category: mockCategories[0], images: imageObj(IMG.banhmi, 3),                allergens: ["Gluten", "Vegan-friendly"],     created_at: "2024-01-01T00:00:00Z" },
  { id: "p-sdh-1",  sku: "SDH-001",   name: "Sourdough loaf",       slug: "sourdough-loaf",       description: "48-hour ferment, Đà Lạt T55, sea salt.",                     base_price: 110000, unit: "loaf",  is_active: true, category: mockCategories[1], images: imageObj(IMG.loaves, 4),  tag: "✦",   allergens: ["Gluten"],                       created_at: "2024-01-01T00:00:00Z" },
  { id: "p-sdh-2",  sku: "SDH-002",   name: "Pain de campagne",     slug: "pain-de-campagne",     description: "Rye · whole wheat. Country crumb.",                          base_price: 125000, unit: "loaf",  is_active: true, category: mockCategories[1], images: imageObj(IMG.loaves, 5),                allergens: ["Gluten"],                       created_at: "2024-01-01T00:00:00Z" },
  { id: "p-cro-1",  sku: "CRO-001",   name: "Croissant au beurre",  slug: "croissant-au-beurre",  description: "AOP butter from Brittany, 81 hand-folded layers.",           base_price: 48000,  unit: "piece", is_active: true, category: mockCategories[2], images: imageObj(IMG.flour, 6),                 allergens: ["Gluten", "Dairy", "Eggs"],     created_at: "2024-01-01T00:00:00Z" },
  { id: "p-cro-2",  sku: "CRO-002",   name: "Pain au chocolat",     slug: "pain-au-chocolat",     description: "Callebaut 70% baton, twin sticks.",                          base_price: 55000,  unit: "piece", is_active: true, category: mockCategories[2], images: imageObj(IMG.pastry, 7),                allergens: ["Gluten", "Dairy", "Eggs"],     created_at: "2024-01-01T00:00:00Z" },
  { id: "p-cro-3",  sku: "CRO-003",   name: "Almond croissant",     slug: "almond-croissant",     description: "Twice-baked, frangipane, shaved almonds.",                   base_price: 62000,  unit: "piece", is_active: true, category: mockCategories[2], images: imageObj(IMG.flour, 8),  tag: "New", allergens: ["Gluten", "Dairy", "Eggs", "Nuts"], created_at: "2024-01-01T00:00:00Z" },
  { id: "p-pas-1",  sku: "PAS-001",   name: "Tart Quýt Hồng",       slug: "tart-quyt-hong",       description: "Mandarin · honey · thyme.",                                  base_price: 95000,  unit: "piece", is_active: true, category: mockCategories[3], images: imageObj(IMG.tart, 9),    tag: "New", allergens: ["Gluten", "Dairy", "Eggs"],     created_at: "2024-01-01T00:00:00Z" },
  { id: "p-pas-2",  sku: "PAS-002",   name: "Mille-feuille",        slug: "mille-feuille",        description: "Vanilla cream · caramel.",                                   base_price: 88000,  unit: "piece", is_active: true, category: mockCategories[3], images: imageObj(IMG.pastry2, 10),              allergens: ["Gluten", "Dairy", "Eggs"],     created_at: "2024-01-01T00:00:00Z" },
  { id: "p-cak-1",  sku: "CAK-001",   name: "Bánh kem dâu",         slug: "banh-kem-dau",         description: "Mascarpone · strawberry · sponge.",                          base_price: 165000, unit: "whole", is_active: true, category: mockCategories[4], images: imageObj(IMG.cake, 11),  tag: "✦",   allergens: ["Gluten", "Dairy", "Eggs"],     created_at: "2024-01-01T00:00:00Z" },
  { id: "p-cak-2",  sku: "CAK-002",   name: "Cheesecake yuzu",      slug: "cheesecake-yuzu",      description: "Cream cheese, yuzu zest, biscuit base.",                     base_price: 185000, unit: "whole", is_active: true, category: mockCategories[4], images: imageObj(IMG.cake2, 12),                allergens: ["Gluten", "Dairy", "Eggs"],     created_at: "2024-01-01T00:00:00Z" },
  { id: "p-cof-1",  sku: "CFE-001",   name: "Cà phê sữa đá",        slug: "ca-phe-sua-da",        description: "Đà Lạt single-origin, condensed milk, ice.",                 base_price: 38000,  unit: "cup",   is_active: true, category: mockCategories[5], images: imageObj(IMG.coffee, 13),               allergens: ["Dairy"],                        created_at: "2024-01-01T00:00:00Z" },
  { id: "p-cof-2",  sku: "CFE-002",   name: "Cà phê đen",           slug: "ca-phe-den",           description: "Cold brew, 18h steep.",                                      base_price: 42000,  unit: "cup",   is_active: true, category: mockCategories[5], images: imageObj(IMG.coffee, 14),               allergens: ["Vegan-friendly"],               created_at: "2024-01-01T00:00:00Z" },
];

export const mockBranches: Branch[] = [
  { id: "br-q1",       name: "Bakerio Quận 1",      address: "65 Lê Lợi, Quận 1",       lat: 10.7738, lng: 106.7030, status: "active", region: "south" },
  { id: "br-hoankiem", name: "Bakerio Hoàn Kiếm",   address: "12 Hàng Bài, Hoàn Kiếm",  lat: 21.0245, lng: 105.8538, status: "active", region: "north" },
  { id: "br-phunhuan", name: "Bakerio Phú Nhuận",   address: "100 Phan Xích Long",      lat: 10.8007, lng: 106.6805, status: "active", region: "south" },
];

const ORDERS_STORAGE_KEY = "bakerio-mock-orders";
const ORDER_SESSION_USER_KEY = "bakerio-mock-order-session-user";

// ── localStorage helpers ────────────────────────────────────
function getSavedProducts(): Product[] {
  if (typeof window !== "undefined" && window.localStorage) {
    const saved = localStorage.getItem("bakerio-mock-products");
    if (saved) {
      try { return JSON.parse(saved); } catch {}
    }
  }
  return mockProducts;
}

function saveProducts(products: Product[]) {
  if (typeof window !== "undefined" && window.localStorage) {
    localStorage.setItem("bakerio-mock-products", JSON.stringify(products));
  }
}

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function getSavedCategories(): Category[] {
  if (typeof window !== "undefined" && window.localStorage) {
    const saved = localStorage.getItem("bakerio-mock-categories");
    if (saved) {
      try { return JSON.parse(saved); } catch {}
    }
  }
  return mockCategories;
}

function saveCategories(categories: Category[]) {
  if (typeof window !== "undefined" && window.localStorage) {
    localStorage.setItem("bakerio-mock-categories", JSON.stringify(categories));
  }
}

export const INITIAL_MOCK_ORDERS: Order[] = [
  {
    id: "order-11055",
    branch_id: "br-le-loi",
    status: "OUT_FOR_DELIVERY",
    items: [
      { id: "oi-11055-0", product_id: "p-bmi-1", product_name: "Bánh mì Sài Gòn", quantity: 2, unit_price: 65000, total_price: 130000 },
      { id: "oi-11055-1", product_id: "p-cof-1", product_name: "Cà phê sữa đá", quantity: 1, unit_price: 38000, total_price: 38000 },
    ],
    subtotal_amount: 168000,
    total_amount: 168000,
    fulfillment_mode: "DELIVERY",
    payment_method: "MOMO",
    delivery_address: "123 Nguyễn Huệ, Bến Nghé, Quận 1, HCMC",
    requested_time: "ASAP",
    delivery_fee_amount: 0,
    loyalty_discount_amount: 0,
    note: "Call on arrival",
    created_at: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
  },
  {
    id: "order-11056",
    branch_id: "br-pasteur",
    status: "READY",
    items: [
      { id: "oi-11056-0", product_id: "p-pas-1", product_name: "Tart Quýt Hồng", quantity: 1, unit_price: 95000, total_price: 95000 },
      { id: "oi-11056-1", product_id: "p-cof-2", product_name: "Cà phê đen", quantity: 1, unit_price: 42000, total_price: 42000 },
    ],
    subtotal_amount: 137000,
    total_amount: 137000,
    fulfillment_mode: "PICKUP",
    payment_method: "VNPAY",
    delivery_address: "188 Pasteur, Quận 3, HCMC (Pickup)",
    requested_time: "ASAP",
    delivery_fee_amount: 0,
    loyalty_discount_amount: 0,
    note: "No sugar",
    created_at: new Date(Date.now() - 40 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
  },
  {
    id: "order-11051",
    branch_id: "br-thao-dien",
    status: "DELIVERED",
    items: [
      { id: "oi-11051-0", product_id: "p-sdh-1", product_name: "Sourdough loaf", quantity: 1, unit_price: 110000, total_price: 110000 },
      { id: "oi-11051-1", product_id: "p-bmi-2", product_name: "Bánh mì heo quay", quantity: 1, unit_price: 72000, total_price: 72000 },
    ],
    subtotal_amount: 182000,
    total_amount: 182000,
    fulfillment_mode: "DELIVERY",
    payment_method: "COD",
    delivery_address: "15 Xuân Thủy, Thảo Điền, Quận 2, HCMC",
    requested_time: "ASAP",
    delivery_fee_amount: 0,
    loyalty_discount_amount: 0,
    created_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 1.5 * 3600 * 1000).toISOString(),
  },
  {
    id: "order-11052",
    branch_id: "br-le-loi",
    status: "PREPARING",
    items: [
      { id: "oi-11052-0", product_id: "p-cro-1", product_name: "Croissant au beurre", quantity: 2, unit_price: 48000, total_price: 96000 },
      { id: "oi-11052-1", product_id: "p-cro-2", product_name: "Pain au chocolat", quantity: 2, unit_price: 55000, total_price: 110000 },
    ],
    subtotal_amount: 206000,
    total_amount: 206000,
    fulfillment_mode: "PICKUP",
    payment_method: "MOMO",
    delivery_address: "42 Lê Lợi, Bến Nghé, Quận 1, HCMC (Pickup)",
    requested_time: "ASAP",
    delivery_fee_amount: 0,
    loyalty_discount_amount: 0,
    created_at: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 8 * 60 * 1000).toISOString(),
  },
  {
    id: "order-11053",
    branch_id: "br-pmh",
    status: "PENDING_PAYMENT",
    items: [
      { id: "oi-11053-0", product_id: "p-cak-1", product_name: "Bánh kem dâu", quantity: 1, unit_price: 165000, total_price: 165000 },
    ],
    subtotal_amount: 165000,
    total_amount: 165000,
    fulfillment_mode: "PICKUP",
    payment_method: "VNPAY",
    delivery_address: "Crescent Mall, Quận 7, HCMC (Pickup)",
    requested_time: "ASAP",
    delivery_fee_amount: 0,
    loyalty_discount_amount: 0,
    created_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
  },
  {
    id: "order-11054",
    branch_id: "br-pasteur",
    status: "PAID",
    items: [
      { id: "oi-11054-0", product_id: "p-sdh-2", product_name: "Pain de campagne", quantity: 1, unit_price: 125000, total_price: 125000 },
      { id: "oi-11054-1", product_id: "p-cro-3", product_name: "Almond croissant", quantity: 1, unit_price: 62000, total_price: 62000 },
    ],
    subtotal_amount: 187000,
    total_amount: 187000,
    fulfillment_mode: "DELIVERY",
    payment_method: "CARD",
    delivery_address: "200 Điện Biên Phủ, Quận 3, HCMC",
    requested_time: "ASAP",
    delivery_fee_amount: 0,
    loyalty_discount_amount: 0,
    created_at: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 12 * 60 * 1000).toISOString(),
  }
];

function parseOrders(raw: string | null): Order[] | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Order[];
  } catch {
    return [];
  }
}

function getScopedOrdersStorageKey(userId: string): string {
  return `${ORDERS_STORAGE_KEY}:${userId}`;
}

export function getMockOrderSessionUser(): string | null {
  if (typeof window === "undefined" || !window.localStorage) {
    return null;
  }
  return localStorage.getItem(ORDER_SESSION_USER_KEY);
}

export function setMockOrderSessionUser(userId: string | null) {
  if (typeof window === "undefined" || !window.localStorage) {
    return;
  }
  if (userId) {
    localStorage.setItem(ORDER_SESSION_USER_KEY, userId);
    return;
  }
  localStorage.removeItem(ORDER_SESSION_USER_KEY);
}

function getSavedOrders(): Order[] {
  if (typeof window !== "undefined" && window.localStorage) {
    const sessionUser = getMockOrderSessionUser();
    if (sessionUser) {
      const scopedSaved = parseOrders(localStorage.getItem(getScopedOrdersStorageKey(sessionUser)));
      if (scopedSaved) {
        return scopedSaved;
      }

      const legacySaved = parseOrders(localStorage.getItem(ORDERS_STORAGE_KEY));
      if (legacySaved) {
        localStorage.setItem(getScopedOrdersStorageKey(sessionUser), JSON.stringify(legacySaved));
        localStorage.removeItem(ORDERS_STORAGE_KEY);
        return legacySaved;
      }

      if (process.env.NODE_ENV === "test") {
        return [];
      }

      return INITIAL_MOCK_ORDERS;
    }

    if (process.env.NODE_ENV === "test") {
      const saved = parseOrders(localStorage.getItem(ORDERS_STORAGE_KEY));
      if (saved) {
        return saved;
      }
      return [];
    }

    return [];
  }
  if (process.env.NODE_ENV === "test") {
    return [];
  }
  return INITIAL_MOCK_ORDERS;
}

function saveOrders(orders: Order[]) {
  if (typeof window !== "undefined" && window.localStorage) {
    const sessionUser = getMockOrderSessionUser();
    if (sessionUser) {
      localStorage.setItem(getScopedOrdersStorageKey(sessionUser), JSON.stringify(orders));
      localStorage.removeItem(ORDERS_STORAGE_KEY);
      return;
    }
    localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(orders));
  }
}


// ── Product API ─────────────────────────────────────────────

export async function getProducts(categorySlug?: string): Promise<Product[]> {
  await delay(150);
  const products = getSavedProducts();
  if (categorySlug) {
    return products.filter((p) => p.category?.slug === categorySlug);
  }
  return products;
}

export async function getProduct(slugOrId: string): Promise<Product | null> {
  await delay(120);
  const products = getSavedProducts();
  return products.find((p) => p.slug === slugOrId || p.id === slugOrId) ?? null;
}

// Audit §II: createProduct used to take `price`; updateProduct took `base_price` — DTO drift.
// Both now take `base_price` to match the real Go DTO.
export async function createProduct(data: {
  sku: string;
  name: string;
  unit: string;
  base_price: number;
  description?: string;
  category_id?: string;
  allergens?: string[];
}): Promise<Product> {
  await delay(250);
  const products = getSavedProducts();
  const category = data.category_id ? mockCategories.find((c) => c.id === data.category_id) : undefined;

  const newProduct: Product = {
    id: `p-${Date.now()}`,
    sku: data.sku,
    name: data.name,
    slug: data.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    description: data.description,
    base_price: data.base_price,
    unit: data.unit,
    is_active: true,
    category,
    allergens: data.allergens,
    images: imageObj("https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600&q=80", Date.now()),
    created_at: new Date().toISOString(),
  };

  products.push(newProduct);
  saveProducts(products);
  return newProduct;
}

export async function updateProduct(
  id: string,
  data: Partial<{
    name: string;
    description: string;
    unit: string;
    is_active: boolean;
    base_price: number;
    allergens: string[];
  }>,
): Promise<Product> {
  await delay(250);
  const products = getSavedProducts();
  const index = products.findIndex((p) => p.id === id);
  if (index === -1) throw new Error("Product not found");

  const current = products[index];
  if (!current) throw new Error("Product not found");
  const updated: Product = {
    ...current,
    ...data,
    slug: data.name ? data.name.toLowerCase().replace(/[^a-z0-9]+/g, "-") : current.slug,
    base_price: data.base_price !== undefined ? data.base_price : current.base_price,
  };

  products[index] = updated;
  saveProducts(products);
  return updated;
}

export async function deleteProduct(id: string): Promise<void> {
  await delay(200);
  let products = getSavedProducts();
  products = products.filter((p) => p.id !== id);
  saveProducts(products);
}

// ── Category & Branch API ───────────────────────────────────
export async function getCategories(): Promise<Category[]> {
  await delay(100);
  return getSavedCategories();
}

export async function createCategory(data: { name: string; parent_id?: string; sort_order?: number }): Promise<Category> {
  await delay(180);
  const categories = [...getSavedCategories()];
  const slug = slugify(data.name);
  const category: Category = {
    id: `cat-${slug || Date.now()}`,
    name: data.name,
    slug,
    parent_id: data.parent_id,
    sort_order: data.sort_order ?? categories.length + 1,
    is_active: true,
  };
  categories.push(category);
  saveCategories(categories);
  return category;
}

export async function updateCategory(
  id: string,
  data: { name: string; parent_id?: string; sort_order?: number; is_active?: boolean },
): Promise<Category> {
  await delay(180);
  const categories = [...getSavedCategories()];
  const index = categories.findIndex((category) => category.id === id || category.slug === id);
  if (index === -1) {
    const category: Category = {
      id,
      name: data.name,
      slug: data.name ? slugify(data.name) : slugify(id),
      parent_id: data.parent_id,
      sort_order: data.sort_order ?? categories.length + 1,
      is_active: data.is_active ?? true,
    };
    categories.push(category);
    saveCategories(categories);
    return category;
  }

  const current = categories[index];
  if (!current) throw new Error(`Category ${id} not found`);

  const updated: Category = {
    id: current.id,
    name: data.name,
    slug: data.name ? slugify(data.name) : current.slug,
    parent_id: data.parent_id ?? current.parent_id,
    sort_order: data.sort_order ?? current.sort_order,
    is_active: data.is_active ?? current.is_active,
  };

  categories[index] = updated;
  saveCategories(categories);
  return updated;
}

export async function deleteCategory(id: string): Promise<void> {
  await delay(180);
  const categories = getSavedCategories().filter((category) => category.id !== id && category.slug !== id);
  saveCategories(categories);
}

export async function getBranches(): Promise<Branch[]> {
  await delay(120);
  return mockBranches;
}

// ── Orders ──────────────────────────────────────────────────
export async function createOrder(data: CreateOrderRequest): Promise<Order> {
  await delay(400);
  const products = getSavedProducts();
  const savedOrders = getSavedOrders();
  const orderIdCounter = savedOrders.length + 1;

  const orderItems: OrderItem[] = data.items.map((item, i) => {
    const product =
      products.find((p) => p.id === item.product_id) ||
      mockProducts.find((p) => p.id === item.product_id);
    if (!product) throw new Error(`Unknown product ${item.product_id}`);
    return {
      id: `oi-${orderIdCounter}-${i}`,
      product_id: item.product_id,
      product_name: product.name,
      quantity: item.quantity,
      unit_price: product.base_price,
      total_price: product.base_price * item.quantity,
    };
  });

  const order: Order = {
    id: `order-${1000 + orderIdCounter}`,
    branch_id: data.branch_id,
    status: "PENDING_PAYMENT",
    items: orderItems,
    subtotal_amount: data.subtotal_amount,
    total_amount: data.total_amount,
    fulfillment_mode: data.fulfillment_mode,
    payment_method: data.payment_method,
    delivery_address: data.delivery_address,
    requested_time: data.requested_time,
    delivery_fee_amount: data.delivery_fee_amount,
    loyalty_discount_amount: data.loyalty_discount_amount,
    crumbs_redeemed: data.crumbs_redeemed,
    note: data.note,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  savedOrders.push(order);
  saveOrders(savedOrders);
  return order;
}

export async function getOrders(): Promise<Order[]> {
  await delay(200);
  const savedOrders = getSavedOrders();
  return [...savedOrders].reverse();
}

export async function getOrder(id: string): Promise<Order | null> {
  await delay(120);
  const savedOrders = getSavedOrders();
  return savedOrders.find((o) => o.id === id) ?? null;
}

export async function updateOrderStatus(id: string, status: Order["status"]): Promise<Order | null> {
  await delay(200);
  const savedOrders = getSavedOrders();
  const index = savedOrders.findIndex((o) => o.id === id);
  if (index === -1) return null;
  const current = savedOrders[index];
  if (!current) return null;
  current.status = status;
  current.updated_at = new Date().toISOString();
  saveOrders(savedOrders);
  return current;
}

// Audit §III order/history: derive lifetime count from saved orders, not hard-coded "47".
export async function getOrderStats(): Promise<{
  lifetime: number;
  inProgress: number;
  delivered: number;
  cancelled: number;
}> {
  await delay(80);
  const savedOrders = getSavedOrders();
  return {
    lifetime: savedOrders.length,
    inProgress: savedOrders.filter((o) =>
      ["PENDING_PAYMENT", "PAID", "CONFIRMED", "PREPARING", "READY", "OUT_FOR_DELIVERY"].includes(o.status),
    ).length,
    delivered: savedOrders.filter((o) => ["DELIVERED", "COMPLETED"].includes(o.status)).length,
    cancelled: savedOrders.filter((o) => o.status === "CANCELLED").length,
  };
}

// Audit §III order/history: reorder helper — clone an order's items into the cart.
export async function reorderItems(orderId: string): Promise<Array<{ product_id: string; quantity: number }>> {
  const order = await getOrder(orderId);
  if (!order) return [];
  return order.items.map((i) => ({ product_id: i.product_id, quantity: i.quantity }));
}

// ── Mock login (unused — real /auth/login takes precedence) ────────
export async function login(
  email: string,
  _password: string,
): Promise<{ access_token: string; user: { id: string; email: string; full_name: string; roles: string[] } }> {
  await delay(300);
  return {
    access_token: "mock-jwt-token-" + Date.now(),
    user: { id: "user-1", email, full_name: "Demo User", roles: ["member"] },
  };
}

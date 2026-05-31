import type {
  Branch,
  Category,
  CreateOrderRequest,
  GetOrdersOptions,
  Order,
  OrderItem,
  PaginatedOrders,
  Product,
  ProductImage,
} from "../types";

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

const MOCK_TS = "2024-01-01T00:00:00Z";

// ── Categories ─────────────────────────────────────────────
// Audit §III: design shows 8 categories, mock had 4. Grown to match.
export const mockCategories: Category[] = [
  { id: "cat-banhmi", name: "Bánh mì", slug: "banh-mi", sort_order: 1, is_active: true, created_at: MOCK_TS, updated_at: MOCK_TS },
  { id: "cat-sourdough", name: "Sourdough", slug: "sourdough", sort_order: 2, is_active: true, created_at: MOCK_TS, updated_at: MOCK_TS },
  { id: "cat-croissant", name: "Croissant", slug: "croissant", sort_order: 3, is_active: true, created_at: MOCK_TS, updated_at: MOCK_TS },
  { id: "cat-pastry", name: "Pastry", slug: "pastry", sort_order: 4, is_active: true, created_at: MOCK_TS, updated_at: MOCK_TS },
  { id: "cat-cake", name: "Cake", slug: "cake", sort_order: 5, is_active: true, created_at: MOCK_TS, updated_at: MOCK_TS },
  { id: "cat-coffee", name: "Cà phê · Drinks", slug: "coffee", sort_order: 6, is_active: true, created_at: MOCK_TS, updated_at: MOCK_TS },
  { id: "cat-seasonal", name: "Seasonal", slug: "seasonal", sort_order: 7, is_active: true, created_at: MOCK_TS, updated_at: MOCK_TS },
  { id: "cat-gift", name: "Gift box", slug: "gift", sort_order: 8, is_active: true, created_at: MOCK_TS, updated_at: MOCK_TS },
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

// ── Products ───────────────────────────────────────────────
// Backend-truthful shape: Product mirrors the Go ProductResponse exactly
// (category_id + price, no sku/unit/description/category-object/images/allergens/tag).
// Demo-only attributes that the backend doesn't persist now live elsewhere:
// product imagery is kept in the standalone mockProductImages store below.
export const mockProducts: Product[] = [
  { id: "p-bmi-1", name: "Bánh mì Sài Gòn",     slug: "banh-mi-sai-gon",     category_id: "cat-banhmi",    price: 65000,  sort_order: 1,  is_active: true, created_at: MOCK_TS, updated_at: MOCK_TS },
  { id: "p-bmi-2", name: "Bánh mì heo quay",    slug: "banh-mi-heo-quay",    category_id: "cat-banhmi",    price: 72000,  sort_order: 2,  is_active: true, created_at: MOCK_TS, updated_at: MOCK_TS },
  { id: "p-bmi-3", name: "Bánh mì chay",        slug: "banh-mi-chay",        category_id: "cat-banhmi",    price: 58000,  sort_order: 3,  is_active: true, created_at: MOCK_TS, updated_at: MOCK_TS },
  { id: "p-sdh-1", name: "Sourdough loaf",      slug: "sourdough-loaf",      category_id: "cat-sourdough", price: 110000, sort_order: 4,  is_active: true, created_at: MOCK_TS, updated_at: MOCK_TS },
  { id: "p-sdh-2", name: "Pain de campagne",    slug: "pain-de-campagne",    category_id: "cat-sourdough", price: 125000, sort_order: 5,  is_active: true, created_at: MOCK_TS, updated_at: MOCK_TS },
  { id: "p-cro-1", name: "Croissant au beurre", slug: "croissant-au-beurre", category_id: "cat-croissant", price: 48000,  sort_order: 6,  is_active: true, created_at: MOCK_TS, updated_at: MOCK_TS },
  { id: "p-cro-2", name: "Pain au chocolat",    slug: "pain-au-chocolat",    category_id: "cat-croissant", price: 55000,  sort_order: 7,  is_active: true, created_at: MOCK_TS, updated_at: MOCK_TS },
  { id: "p-cro-3", name: "Almond croissant",    slug: "almond-croissant",    category_id: "cat-croissant", price: 62000,  sort_order: 8,  is_active: true, created_at: MOCK_TS, updated_at: MOCK_TS },
  { id: "p-pas-1", name: "Tart Quýt Hồng",      slug: "tart-quyt-hong",      category_id: "cat-pastry",    price: 95000,  sort_order: 9,  is_active: true, created_at: MOCK_TS, updated_at: MOCK_TS },
  { id: "p-pas-2", name: "Mille-feuille",       slug: "mille-feuille",       category_id: "cat-pastry",    price: 88000,  sort_order: 10, is_active: true, created_at: MOCK_TS, updated_at: MOCK_TS },
  { id: "p-cak-1", name: "Bánh kem dâu",        slug: "banh-kem-dau",        category_id: "cat-cake",      price: 165000, sort_order: 11, is_active: true, created_at: MOCK_TS, updated_at: MOCK_TS },
  { id: "p-cak-2", name: "Cheesecake yuzu",     slug: "cheesecake-yuzu",     category_id: "cat-cake",      price: 185000, sort_order: 12, is_active: true, created_at: MOCK_TS, updated_at: MOCK_TS },
  { id: "p-cof-1", name: "Cà phê sữa đá",       slug: "ca-phe-sua-da",       category_id: "cat-coffee",    price: 38000,  sort_order: 13, is_active: true, created_at: MOCK_TS, updated_at: MOCK_TS },
  { id: "p-cof-2", name: "Cà phê đen",          slug: "ca-phe-den",          category_id: "cat-coffee",    price: 42000,  sort_order: 14, is_active: true, created_at: MOCK_TS, updated_at: MOCK_TS },
];

// Standalone product-image store (Product no longer carries images, mirroring
// the backend where images are a separate /products/:id/images resource).
const mockProductImages: Record<string, ProductImage[]> = {
  "p-bmi-1": [{ id: "img-p-bmi-1", product_id: "p-bmi-1", url: IMG.banhmi, sort_order: 0 }],
  "p-bmi-2": [{ id: "img-p-bmi-2", product_id: "p-bmi-2", url: IMG.banhmi, sort_order: 0 }],
  "p-bmi-3": [{ id: "img-p-bmi-3", product_id: "p-bmi-3", url: IMG.banhmi, sort_order: 0 }],
  "p-sdh-1": [{ id: "img-p-sdh-1", product_id: "p-sdh-1", url: IMG.loaves, sort_order: 0 }],
  "p-sdh-2": [{ id: "img-p-sdh-2", product_id: "p-sdh-2", url: IMG.loaves, sort_order: 0 }],
  "p-cro-1": [{ id: "img-p-cro-1", product_id: "p-cro-1", url: IMG.flour, sort_order: 0 }],
  "p-cro-2": [{ id: "img-p-cro-2", product_id: "p-cro-2", url: IMG.pastry, sort_order: 0 }],
  "p-cro-3": [{ id: "img-p-cro-3", product_id: "p-cro-3", url: IMG.flour, sort_order: 0 }],
  "p-pas-1": [{ id: "img-p-pas-1", product_id: "p-pas-1", url: IMG.tart, sort_order: 0 }],
  "p-pas-2": [{ id: "img-p-pas-2", product_id: "p-pas-2", url: IMG.pastry2, sort_order: 0 }],
  "p-cak-1": [{ id: "img-p-cak-1", product_id: "p-cak-1", url: IMG.cake, sort_order: 0 }],
  "p-cak-2": [{ id: "img-p-cak-2", product_id: "p-cak-2", url: IMG.cake2, sort_order: 0 }],
  "p-cof-1": [{ id: "img-p-cof-1", product_id: "p-cof-1", url: IMG.coffee, sort_order: 0 }],
  "p-cof-2": [{ id: "img-p-cof-2", product_id: "p-cof-2", url: IMG.coffee, sort_order: 0 }],
};

export const mockBranches: Branch[] = [
  { id: "br-q1",       name: "Bakerio Quận 1",      address: "65 Lê Lợi, Quận 1",       opening_hours: "07:00-21:00", lat: 10.7738, lng: 106.7030, status: "active", created_at: MOCK_TS },
  { id: "br-hoankiem", name: "Bakerio Hoàn Kiếm",   address: "12 Hàng Bài, Hoàn Kiếm",  opening_hours: "07:00-12:00", lat: 21.0245, lng: 105.8538, status: "active", created_at: MOCK_TS },
  { id: "br-phunhuan", name: "Bakerio Phú Nhuận",   address: "100 Phan Xích Long",      opening_hours: "07:00-21:00", lat: 10.8007, lng: 106.6805, status: "active", created_at: MOCK_TS },
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
    const category = getSavedCategories().find((c) => c.slug === categorySlug);
    if (!category) return [];
    return products.filter((p) => p.category_id === category.id);
  }
  return products;
}

export async function getProduct(slugOrId: string): Promise<Product | null> {
  await delay(120);
  const products = getSavedProducts();
  return products.find((p) => p.slug === slugOrId || p.id === slugOrId) ?? null;
}

// Backend-truthful: createProduct mirrors the Go CreateProductRequest
// ({ name, category_id, price, sort_order }).
export async function createProduct(data: {
  name: string;
  category_id: string;
  price: number;
  sort_order?: number;
}): Promise<Product> {
  await delay(250);
  const products = getSavedProducts();
  const now = new Date().toISOString();

  const newProduct: Product = {
    id: `p-${Date.now()}`,
    name: data.name,
    slug: slugify(data.name),
    category_id: data.category_id,
    price: data.price,
    sort_order: data.sort_order ?? products.length + 1,
    is_active: true,
    created_at: now,
    updated_at: now,
  };

  products.push(newProduct);
  saveProducts(products);
  return newProduct;
}

// Backend-truthful: updateProduct mirrors the Go UpdateProductRequest full-replace
// ({ name, category_id, price, sort_order, is_active }).
export async function updateProduct(
  id: string,
  data: {
    name: string;
    category_id: string;
    price: number;
    sort_order: number;
    is_active: boolean;
  },
): Promise<Product> {
  await delay(250);
  const products = getSavedProducts();
  const index = products.findIndex((p) => p.id === id);
  if (index === -1) throw new Error("Product not found");

  const current = products[index];
  if (!current) throw new Error("Product not found");

  const updated: Product = {
    ...current,
    name: data.name,
    slug: data.name ? slugify(data.name) : current.slug,
    category_id: data.category_id,
    price: data.price,
    sort_order: data.sort_order,
    is_active: data.is_active,
    updated_at: new Date().toISOString(),
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

export async function createCategory(data: { name: string; sort_order?: number }): Promise<Category> {
  await delay(180);
  const categories = [...getSavedCategories()];
  const slug = slugify(data.name);
  const now = new Date().toISOString();
  const category: Category = {
    id: `cat-${slug || Date.now()}`,
    name: data.name,
    slug,
    sort_order: data.sort_order ?? categories.length + 1,
    is_active: true,
    created_at: now,
    updated_at: now,
  };
  categories.push(category);
  saveCategories(categories);
  return category;
}

export async function updateCategory(
  id: string,
  data: { name: string; sort_order?: number; is_active?: boolean },
): Promise<Category> {
  await delay(180);
  const categories = [...getSavedCategories()];
  const now = new Date().toISOString();
  const index = categories.findIndex((category) => category.id === id || category.slug === id);
  if (index === -1) {
    const category: Category = {
      id,
      name: data.name,
      slug: data.name ? slugify(data.name) : slugify(id),
      sort_order: data.sort_order ?? categories.length + 1,
      is_active: data.is_active ?? true,
      created_at: now,
      updated_at: now,
    };
    categories.push(category);
    saveCategories(categories);
    return category;
  }

  const current = categories[index];
  if (!current) throw new Error(`Category ${id} not found`);

  const updated: Category = {
    ...current,
    name: data.name,
    slug: data.name ? slugify(data.name) : current.slug,
    sort_order: data.sort_order ?? current.sort_order,
    is_active: data.is_active ?? current.is_active,
    updated_at: now,
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
    const productName = product?.name ?? `Product ${item.product_id.slice(0, 8)}`;
    const unitPrice = product?.price ?? 0;
    return {
      id: `oi-${orderIdCounter}-${i}`,
      product_id: item.product_id,
      product_name: productName,
      quantity: item.quantity,
      unit_price: unitPrice,
      total_price: unitPrice * item.quantity,
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

export async function getOrders(opts?: GetOrdersOptions): Promise<PaginatedOrders> {
  await delay(200);
  const savedOrders = getSavedOrders();
  let filtered = [...savedOrders].reverse();

  if (opts?.status) {
    const statuses = opts.status.split(",");
    filtered = filtered.filter((o) => statuses.includes(o.status));
  }

  if (opts?.search) {
    const s = opts.search.toLowerCase();
    filtered = filtered.filter((o) => 
      o.id.toLowerCase().includes(s) ||
      o.status.toLowerCase().includes(s) ||
      o.delivery_address?.toLowerCase().includes(s) ||
      o.items.some(
        (item) => item.product_name.toLowerCase().includes(s)
      )
    );
  }

  const page = opts?.page ?? 1;
  const size = opts?.size ?? 10;
  const total = filtered.length;
  const pages = Math.ceil(total / size);

  const start = (page - 1) * size;
  const items = filtered.slice(start, start + size);

  return { items, total, page, size, pages };
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

// Product images live in a standalone store (the backend exposes them as a
// separate /products/:id/images resource, not a field on Product). Primary
// image is determined by sort_order (lowest = primary), so there is no
// is_primary flag.
export async function listProductImages(productId: string): Promise<ProductImage[]> {
  await delay(100);
  const images = mockProductImages[productId];
  return images ? [...images] : [];
}

export async function uploadProductImages(productId: string, files: File[]): Promise<ProductImage[]> {
  await delay(300);
  const existingImages = mockProductImages[productId] ?? [];

  const newImages: ProductImage[] = files.map((file, i) => ({
    id: `img-${Date.now()}-${i}`,
    product_id: productId,
    url: URL.createObjectURL(file),
    sort_order: existingImages.length + i,
  }));

  const updatedImages = [...existingImages, ...newImages];
  mockProductImages[productId] = updatedImages;
  return updatedImages;
}

export async function deleteProductImage(productId: string, imageId: string): Promise<void> {
  await delay(150);
  const existingImages = mockProductImages[productId] ?? [];
  mockProductImages[productId] = existingImages.filter((img) => img.id !== imageId);
}

export * from "./addresses";

import type { Product, Category, Branch, Order, OrderItem } from "../types";

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

export const mockCategories: Category[] = [
  { id: "cat-1", name: "Cakes", slug: "cakes", sort_order: 1, is_active: true },
  { id: "cat-2", name: "Pastries", slug: "pastries", sort_order: 2, is_active: true },
  { id: "cat-3", name: "Bread", slug: "bread", sort_order: 3, is_active: true },
  { id: "cat-4", name: "Drinks", slug: "drinks", sort_order: 4, is_active: true },
];

export const mockProducts: Product[] = [
  { id: "p-1", sku: "CAKE-001", name: "Vanilla Sponge Cake", slug: "vanilla-sponge-cake", description: "Light, fluffy, made with Madagascar vanilla beans and farm-fresh eggs.", base_price: 185000, unit: "piece", is_active: true, category: mockCategories[0], images: [{ id: "img-1", url: "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=600&q=80", is_primary: true, sort_order: 0 }], created_at: "2024-01-01T00:00:00Z" },
  { id: "p-2", sku: "CAKE-002", name: "Chocolate Fondant", slug: "chocolate-fondant", description: "Rich Belgian chocolate with a molten center, served warm.", base_price: 148000, unit: "piece", is_active: true, category: mockCategories[0], images: [{ id: "img-2", url: "https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=600&q=80", is_primary: true, sort_order: 0 }], created_at: "2024-01-01T00:00:00Z" },
  { id: "p-3", sku: "CAKE-003", name: "Lemon Drizzle Loaf", slug: "lemon-drizzle-loaf", description: "Zesty lemon cake with a sweet glaze, perfect with afternoon tea.", base_price: 92000, unit: "piece", is_active: true, category: mockCategories[0], images: [{ id: "img-3", url: "https://images.unsplash.com/photo-1509365465985-25d11c17e812?w=600&q=80", is_primary: true, sort_order: 0 }], created_at: "2024-01-01T00:00:00Z" },
  { id: "p-4", sku: "PAST-001", name: "Butter Croissant", slug: "butter-croissant", description: "Flaky, buttery layers baked to golden perfection.", base_price: 45000, unit: "piece", is_active: true, category: mockCategories[1], images: [{ id: "img-4", url: "https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=600&q=80", is_primary: true, sort_order: 0 }], created_at: "2024-01-01T00:00:00Z" },
  { id: "p-5", sku: "BREAD-001", name: "Sourdough Loaf", slug: "sourdough-loaf", description: "72-hour fermented sourdough with a crispy crust.", base_price: 75000, unit: "piece", is_active: true, category: mockCategories[2], images: [{ id: "img-5", url: "https://images.unsplash.com/photo-1549931319-a545753467c8?w=600&q=80", is_primary: true, sort_order: 0 }], created_at: "2024-01-01T00:00:00Z" },
  { id: "p-6", sku: "CAKE-004", name: "Strawberry Tart", slug: "strawberry-tart", description: "Fresh strawberries on vanilla custard in a buttery shell.", base_price: 128000, unit: "piece", is_active: true, category: mockCategories[1], images: [{ id: "img-6", url: "https://images.unsplash.com/photo-1464349095431-e9a21285b5f3?w=600&q=80", is_primary: true, sort_order: 0 }], created_at: "2024-01-01T00:00:00Z" },
  { id: "p-7", sku: "CAKE-005", name: "Tiramisu", slug: "tiramisu", description: "House-made mascarpone, espresso-soaked ladyfingers.", base_price: 165000, unit: "piece", is_active: true, category: mockCategories[0], images: [{ id: "img-7", url: "https://images.unsplash.com/photo-1486427944544-d2c246c4df14?w=600&q=80", is_primary: true, sort_order: 0 }], created_at: "2024-01-01T00:00:00Z" },
  { id: "p-8", sku: "CAKE-006", name: "Matcha Cheesecake", slug: "matcha-cheesecake", description: "Japanese matcha on a creamy cheesecake base.", base_price: 155000, unit: "piece", is_active: true, category: mockCategories[0], images: [{ id: "img-8", url: "https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=600&q=80", is_primary: true, sort_order: 0 }], created_at: "2024-01-01T00:00:00Z" },
  { id: "p-9", sku: "CAKE-007", name: "Red Velvet", slug: "red-velvet", description: "Classic red velvet with cream cheese frosting.", base_price: 175000, unit: "piece", is_active: true, category: mockCategories[0], images: [{ id: "img-9", url: "https://images.unsplash.com/photo-1616541823729-00fe0aacd32c?w=600&q=80", is_primary: true, sort_order: 0 }], created_at: "2024-01-01T00:00:00Z" },
  { id: "p-10", sku: "DRINK-001", name: "Iced Latte", slug: "iced-latte", description: "Smooth espresso with cold milk over ice.", base_price: 55000, unit: "cup", is_active: true, category: mockCategories[3], images: [{ id: "img-10", url: "https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=600&q=80", is_primary: true, sort_order: 0 }], created_at: "2024-01-01T00:00:00Z" },
];

export const mockBranches: Branch[] = [
  { id: "br-1", name: "Bakerio Saigon Centre", address: "65 Lê Lợi, District 1", lat: 10.7731, lng: 106.7009, status: "active", region: "south" },
  { id: "br-2", name: "Bakerio Thảo Điền", address: "12 Nguyễn Đăng Giai, Thủ Đức", lat: 10.8031, lng: 106.7351, status: "active", region: "south" },
  { id: "br-3", name: "Bakerio Phú Mỹ Hưng", address: "Crescent Mall, District 7", lat: 10.7295, lng: 106.7186, status: "active", region: "south" },
];

function getSavedProducts(): Product[] {
  if (typeof window !== "undefined" && window.localStorage) {
    const saved = localStorage.getItem("bakerio-mock-products");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {}
    }
  }
  return mockProducts;
}

function saveProducts(products: Product[]) {
  if (typeof window !== "undefined" && window.localStorage) {
    localStorage.setItem("bakerio-mock-products", JSON.stringify(products));
  }
}

function getSavedOrders(): Order[] {
  if (typeof window !== "undefined" && window.localStorage) {
    const saved = localStorage.getItem("bakerio-mock-orders");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {}
    }
  }
  return [];
}

function saveOrders(orders: Order[]) {
  if (typeof window !== "undefined" && window.localStorage) {
    localStorage.setItem("bakerio-mock-orders", JSON.stringify(orders));
  }
}

// --- Mock API functions ---

export async function getProducts(categorySlug?: string): Promise<Product[]> {
  await delay(300);
  const products = getSavedProducts();
  if (categorySlug) {
    return products.filter((p) => p.category?.slug === categorySlug);
  }
  return products;
}

export async function getProduct(slugOrId: string): Promise<Product | null> {
  await delay(200);
  const products = getSavedProducts();
  return products.find((p) => p.slug === slugOrId || p.id === slugOrId) ?? null;
}

export async function createProduct(data: { sku: string; name: string; unit: string; price: number; description?: string; category_id?: string }): Promise<Product> {
  await delay(300);
  const products = getSavedProducts();
  
  let category: Category | undefined;
  if (data.category_id) {
    category = mockCategories.find((c) => c.id === data.category_id);
  }
  
  const newProduct: Product = {
    id: `p-${Date.now()}`,
    sku: data.sku,
    name: data.name,
    slug: data.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    description: data.description,
    base_price: data.price,
    unit: data.unit,
    is_active: true,
    category,
    images: [{ id: `img-${Date.now()}`, url: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600&q=80", is_primary: true, sort_order: 0 }],
    created_at: new Date().toISOString(),
  };
  
  products.push(newProduct);
  saveProducts(products);
  return newProduct;
}

export async function updateProduct(id: string, data: Partial<{ name: string; description: string; unit: string; is_active: boolean; base_price: number }>): Promise<Product> {
  await delay(300);
  const products = getSavedProducts();
  const index = products.findIndex((p) => p.id === id);
  if (index === -1) throw new Error("Product not found");
  
  const updated = {
    ...products[index],
    ...data,
    slug: data.name ? data.name.toLowerCase().replace(/[^a-z0-9]+/g, "-") : products[index].slug,
    base_price: data.base_price !== undefined ? data.base_price : products[index].base_price,
  };
  
  products[index] = updated;
  saveProducts(products);
  return updated;
}

export async function deleteProduct(id: string): Promise<void> {
  await delay(300);
  let products = getSavedProducts();
  products = products.filter((p) => p.id !== id);
  saveProducts(products);
}

export async function getCategories(): Promise<Category[]> {
  await delay(150);
  return mockCategories;
}

export async function getBranches(): Promise<Branch[]> {
  await delay(200);
  return mockBranches;
}

export async function createOrder(items: { product_id: string; quantity: number }[], branchId: string, note?: string): Promise<Order> {
  await delay(500);
  const products = getSavedProducts();
  const savedOrders = getSavedOrders();
  const orderIdCounter = savedOrders.length + 1;
  
  const orderItems: OrderItem[] = items.map((item, i) => {
    const product = products.find((p) => p.id === item.product_id) || mockProducts.find((p) => p.id === item.product_id)!;
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
    branch_id: branchId,
    status: "PENDING_PAYMENT",
    items: orderItems,
    total_amount: orderItems.reduce((s, i) => s + i.total_price, 0),
    note,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  savedOrders.push(order);
  saveOrders(savedOrders);
  return order;
}

export async function getOrders(): Promise<Order[]> {
  await delay(300);
  const savedOrders = getSavedOrders();
  return [...savedOrders].reverse();
}

export async function getOrder(id: string): Promise<Order | null> {
  await delay(200);
  const savedOrders = getSavedOrders();
  return savedOrders.find((o) => o.id === id) ?? null;
}

export async function updateOrderStatus(id: string, status: Order["status"]): Promise<Order | null> {
  await delay(300);
  const savedOrders = getSavedOrders();
  const index = savedOrders.findIndex((o) => o.id === id);
  if (index === -1) return null;
  savedOrders[index].status = status;
  savedOrders[index].updated_at = new Date().toISOString();
  saveOrders(savedOrders);
  return savedOrders[index];
}

export async function login(email: string, _password: string): Promise<{ access_token: string; user: { id: string; email: string; full_name: string; roles: string[] } }> {
  await delay(400);
  return {
    access_token: "mock-jwt-token-" + Date.now(),
    user: { id: "user-1", email, full_name: "Demo User", roles: ["member"] },
  };
}

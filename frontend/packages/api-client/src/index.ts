export type { Product, Category, ProductImage, Branch, Order, OrderItem, OrderStatus, CartItem, User, LoginRequest, LoginResponse, ApiResponse } from "./types";

export const VERSION = "1.0.0";

// Re-export the hybrid client (real + mock)
export {
  // Auth (REAL)
  login, register, logout, setToken, getToken,
  // Products (REAL)
  getProducts, getProduct, createProduct, updateProduct, deleteProduct,
  // Categories (REAL)
  getCategories, getCategory, createCategory, updateCategory, deleteCategory,
  // Branches (REAL)
  getBranches, getBranch, createBranch, updateBranch, deleteBranch,
  // Suppliers (REAL)
  getSuppliers, createSupplier,
  // Procurement (REAL)
  getProcurementOrders, createProcurementOrder, updateProcurementStatus,
  // Users (REAL)
  createUser, getUserProfile, getMyProfile, updateMyProfile,
  // Orders (MOCK — until backend implements)
  createOrder, getOrders, getOrder, updateOrderStatus,
} from "./client";

// Also export mock data for seeding/testing
export { mockProducts, mockCategories, mockBranches } from "./mock";

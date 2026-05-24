export type {
  Product,
  Category,
  ProductImage,
  Branch,
  Order,
  OrderItem,
  OrderStatus,
  CartItem,
  User,
  LoginRequest,
  LoginResponse,
  ApiResponse,
} from "./types";

export const VERSION = "1.0.0";

// Re-export the hybrid client (real + mock).
export {
  // Auth (REAL)
  login,
  register,
  logout,
  setToken,
  getToken,
  // Products — silent-fallback to mock when the Go product handler isn't there.
  // Audit §I: the real /products endpoint is *missing* in the current backend.
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  // Categories (REAL)
  getCategories,
  getCategory,
  createCategory,
  updateCategory,
  deleteCategory,
  // Branches (REAL)
  getBranches,
  getBranch,
  createBranch,
  updateBranch,
  deleteBranch,
  // Branch membership (REAL)
  getBranchMembers,
  assignBranchMember,
  removeBranchMember,
  // Suppliers / Procurement — backend has no module, audit §I flagged this.
  // These now hit a local mock with the same shape.
  getSuppliers,
  createSupplier,
  getProcurementOrders,
  createProcurementOrder,
  updateProcurementStatus,
  // Users (REAL — list is composed from /branch + /branch/:id/members)
  createUser,
  getUserProfile,
  getMyProfile,
  updateMyProfile,
  // Orders (MOCK — backend has no /orders handler)
  createOrder,
  getOrders,
  getOrder,
  updateOrderStatus,
  getOrderStats,
  reorderItems,
} from "./client";

// Mock data for seeding/testing
export { mockProducts, mockCategories, mockBranches } from "./mock";

export type { BranchMember } from "./client";

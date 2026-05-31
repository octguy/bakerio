export type {
  Product,
  Category,
  ProductImage,
  BranchBrief,
  BranchProduct,
  Branch,
  Profile,
  CreateUserResponse,
  Order,
  OrderItem,
  OrderStatus,
  OrderFulfillmentMode,
  CreateOrderItemInput,
  CreateOrderRequest,
  CartItem,
  User,
  LoginRequest,
  LoginResponse,
  ApiResponse,
  GetOrdersOptions,
  PaginatedOrders,
  SavedAddress,
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
  // Products — GET /products is now a PUBLIC endpoint (no auth needed).
  // Keep the mock fallback as a safety net when product fetches fail.
  getProducts,
  getProductsPage,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  listProductImages,
  uploadProductImages,
  deleteProductImage,
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
  updateBranchStatus,
  setBranchProductAvailability,
  deleteBranch,
  // Branch membership (REAL)
  getBranchMembers,
  assignBranchMember,
  removeBranchMember,
  // Users (REAL — list is composed from /branch + /branch/:id/members)
  createUser,
  getUserProfile,
  updateUserProfile,
  getMyProfile,
  updateMyProfile,
  changePassword,
  setUserPassword,
  // Orders (MOCK — backend has no /orders handler)
  createOrder,
  getOrders,
  getOrder,
  updateOrderStatus,
  getOrderStats,
  reorderItems,
  // Addresses (MOCK — backend has no /addresses handler)
  getAddresses,
  addAddress,
  removeAddress,
  setDefaultAddress,
} from "./client";

// Mock data for seeding/testing
export {
  mockProducts,
  mockCategories,
  mockBranches,
  getMockOrderSessionUser,
  setMockOrderSessionUser,
} from "./mock";

export type { BranchMember } from "./client";

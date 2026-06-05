export type {
  Product,
  Category,
  ProductImage,
  BranchBrief,
  BranchProduct,
  BranchProductDetail,
  Branch,
  Profile,
  CreateUserResponse,
  Order,
  OrderItem,
  OrderStatus,
  OrderFulfillmentMode,
  CreateOrderItemInput,
  CreateOrderRequest,
  FindOrderBranchesRequest,
  FindOrderBranchesResponse,
  OrderBranchOption,
  OrderMissingItem,
  SelectOrderBranchRequest,
  SelectOrderBranchResponse,
  CartItemResponse,
  CartResponse,
  User,
  LoginRequest,
  LoginResponse,
  ApiResponse,
  PaginatedResponse,
  BranchProductDetailListResponse,
  StatisticsOverview,
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
  getBranchesPage,
  getBranch,
  createBranch,
  updateBranch,
  updateBranchStatus,
  setBranchProductAvailability,
  setBranchProductStock,
  getBranchProducts,
  getBranchProductMap,
  deleteBranch,
  // Branch membership (REAL)
  getBranchMembers,
  assignBranchMember,
  removeBranchMember,
  // Users (REAL)
  createUser,
  getUsersPage,
  getStaffUsers,
  getUserProfile,
  updateUserProfile,
  getMyProfile,
  updateMyProfile,
  changePassword,
  setUserPassword,
  // Orders (REAL)
  findOrderBranches,
  selectOrderBranch,
  confirmOrder,
  createOrder,
  getOrders,
  getOrder,
  updateOrderStatus,
  getOrderStats,
  reorderItems,
  // Cart (REAL)
  getCart,
  addCartItem,
  updateCartItem,
  removeCartItem,
  clearCart,

  // Statistics (REAL)
  getStatisticsOverview,

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

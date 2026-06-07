# Bakerio — Tài liệu Nghiệp vụ Hệ thống

> **Stack:** Go (Gin) · PostgreSQL · SQLC · Kiến trúc Modular Monolith  
> **Phạm vi:** 10 chi nhánh tại TP.HCM + Kênh E-commerce

---

## 1. Tổng quan hệ thống

Bakerio là hệ thống quản lý chuỗi tiệm bánh tích hợp, bao gồm:

- **Back-office (HQ):** Quản lý tập trung toàn chuỗi từ văn phòng trung tâm
- **In-store (POS):** Vận hành tại từng chi nhánh (bán hàng tại quầy, kho, sản xuất)
- **E-commerce:** Kênh đặt hàng online cho khách hàng (Web / App)

---

## 2. Danh sách Module

| Module | Mô tả |
|---|---|
| `auth` | Xác thực, phân quyền, quản lý session/token |
| `user` | Quản lý tài khoản nội bộ (staff, admin) và khách hàng |
| `branch` | Quản lý danh sách chi nhánh |
| `product` | Danh mục sản phẩm, giá, hình ảnh |
| `inventory` | Quản lý tồn kho nguyên liệu và thành phẩm theo chi nhánh |
| `order` | Đơn hàng (POS tại quầy + Online), trạng thái, order routing |
| `production` | Kế hoạch sản xuất bánh hàng ngày |
| `supplier` | Quản lý nhà cung cấp, đơn nhập hàng |
| `promotion` | Voucher, chương trình khuyến mãi, tích điểm |
| `ecommerce` | Banner, SEO, giỏ hàng, checkout online |
| `notification` | Gửi thông báo nội bộ (WebSocket/Push) |
| `report` | Báo cáo doanh thu, tồn kho, sản xuất |
| `delivery` | Quản lý giao hàng, lộ trình, COD |

---

## 3. Phân quyền — Roles & Permissions

### 3.1 Nguyên tắc đặt tên Permission

```
<module>:<action>:<scope>
```

| Scope | Ý nghĩa |
|---|---|
| `own` | Chỉ tác động lên tài nguyên của chính mình |
| `branch` | Trong phạm vi chi nhánh đang đăng nhập (`branch_id`) |
| `all` | Toàn hệ thống, không giới hạn chi nhánh |

**Ví dụ:**

```
order:create:own        -- Khách tự đặt đơn của mình
order:update:branch     -- Nhân viên cập nhật đơn trong chi nhánh
order:view:all          -- Manager tổng xem tất cả đơn hàng
inventory:adjust:branch -- Thủ kho cập nhật tồn kho chi nhánh
```

---

### 3.2 Nhóm Quản trị hệ thống (HQ)

#### Role: `super_admin`
Quản trị tối cao hệ thống.

| Permission | Mô tả |
|---|---|
| `*:*:all` | Toàn quyền mọi module |
| `auth:manage_roles:all` | Tạo/sửa/xóa role và permission |
| `branch:create:all` | Tạo chi nhánh mới |
| `module:configure:all` | Cấu hình module hệ thống |

---

#### Role: `general_manager`
Giám đốc chuỗi.

| Permission | Mô tả |
|---|---|
| `report:view:all` | Xem báo cáo doanh thu toàn chuỗi |
| `branch:view:all` | Xem danh sách và thông tin tất cả chi nhánh |
| `promotion:approve:all` | Phê duyệt chương trình khuyến mãi |
| `order:view:all` | Xem tất cả đơn hàng |
| `user:view:all` | Xem danh sách nhân viên toàn hệ thống |
| `inventory:view:all` | Xem tồn kho toàn chuỗi |

---

#### Role: `inventory_manager`
Quản lý kho tổng (HQ).

| Permission | Mô tả |
|---|---|
| `inventory:view:all` | Xem tồn kho tất cả chi nhánh |
| `inventory:transfer:all` | Điều phối nguyên liệu giữa các kho |
| `supplier:manage:all` | Quản lý nhà cung cấp |
| `inventory:define_recipe:all` | Định mức nguyên liệu cho từng loại bánh |
| `inventory:create_po:all` | Tạo đơn nhập hàng tổng |

---

#### Role: `marketing_manager`
Quản lý E-commerce & Marketing.

| Permission | Mô tả |
|---|---|
| `ecommerce:manage_banner:all` | Quản lý banner Web/App |
| `promotion:manage:all` | Tạo/sửa mã giảm giá, voucher |
| `product:update_price:all` | Cập nhật giá sản phẩm |
| `ecommerce:email_campaign:all` | Quản lý chiến dịch email marketing |
| `report:view_ecommerce:all` | Xem báo cáo kênh online |

---

### 3.3 Nhóm Vận hành Chi nhánh (Store Level)

> **Lưu ý:** Toàn bộ query tại nhóm này **bắt buộc** kèm `WHERE branch_id = $branch_id` (xem mục 4).

---

#### Role: `store_manager`
Cửa hàng trưởng — quản lý 1 chi nhánh cụ thể.

| Permission | Mô tả |
|---|---|
| `user:manage:branch` | Quản lý nhân viên trong chi nhánh |
| `inventory:approve_receipt:branch` | Duyệt nhập kho lẻ |
| `report:view:branch` | Xem báo cáo doanh thu chi nhánh |
| `order:view:branch` | Xem toàn bộ đơn hàng chi nhánh |
| `product:view:all` | Xem danh mục sản phẩm |
| `promotion:view:all` | Xem chương trình khuyến mãi đang áp dụng |
| `shift:manage:branch` | Phân ca nhân viên |

---

#### Role: `staff_cashier`
Nhân viên bán hàng / Thu ngân.

| Permission | Mô tả |
|---|---|
| `order:create:branch` | Lập hóa đơn tại quầy (POS) |
| `order:update:branch` | Cập nhật trạng thái đơn (Đang chuẩn bị, Đã giao) |
| `order:confirm_online:branch` | Xác nhận đơn online đổ về chi nhánh |
| `product:view:all` | Xem menu sản phẩm |
| `inventory:view:branch` | Xem tồn kho hiện tại tại chi nhánh |
| `customer:lookup:all` | Tra cứu thông tin khách hàng (tích điểm) |

---

#### Role: `baker`
Thợ làm bánh.

| Permission | Mô tả |
|---|---|
| `production:view_plan:branch` | Xem danh sách bánh cần làm trong ngày |
| `production:update_output:branch` | Cập nhật số lượng bánh vừa ra lò |
| `inventory:update_shelf:branch` | Cập nhật số lượng lên kệ hàng ảo |

---

#### Role: `shipper`
Nhân viên giao hàng (đội xe nội bộ chi nhánh).

| Permission | Mô tả |
|---|---|
| `delivery:view_route:branch` | Xem lộ trình giao hàng được phân công |
| `delivery:update_status:branch` | Cập nhật trạng thái "Đã giao thành công" |
| `delivery:confirm_cod:branch` | Xác nhận thu tiền COD |
| `order:view:branch` | Xem chi tiết đơn hàng được giao |

---

### 3.4 Nhóm Khách hàng (E-commerce)

#### Role: `guest`
Khách vãng lai chưa đăng nhập.

| Permission | Mô tả |
|---|---|
| `product:view:all` | Xem thực đơn, tìm kiếm sản phẩm |
| `branch:view:all` | Tìm chi nhánh gần nhất |
| `cart:manage:own` | Thêm/xóa sản phẩm trong giỏ hàng (session) |

---

#### Role: `member`
Khách hàng đã đăng ký tài khoản.

| Permission | Mô tả |
|---|---|
| `product:view:all` | Xem thực đơn |
| `branch:view:all` | Xem chi nhánh |
| `cart:manage:own` | Quản lý giỏ hàng |
| `order:create:own` | Đặt hàng online |
| `order:view:own` | Xem lịch sử đơn hàng của mình |
| `order:cancel:own` | Hủy đơn (trong thời gian cho phép) |
| `loyalty:view:own` | Xem điểm tích lũy |
| `loyalty:redeem:own` | Đổi điểm lấy quà / giảm giá |
| `review:create:own` | Đánh giá sản phẩm đã mua |
| `profile:manage:own` | Cập nhật thông tin cá nhân, địa chỉ |

---

## 4. Multi-tenancy — Phân lập dữ liệu chi nhánh

### 4.1 Nguyên tắc

Mọi bảng dữ liệu liên quan đến vận hành chi nhánh **bắt buộc** có cột `branch_id`:

```sql
-- Các bảng cần branch_id
orders          (branch_id BIGINT NOT NULL REFERENCES branches(id))
order_items     (branch_id BIGINT NOT NULL)
inventory       (branch_id BIGINT NOT NULL)
staffs          (branch_id BIGINT NOT NULL)
production_logs (branch_id BIGINT NOT NULL)
delivery_tasks  (branch_id BIGINT NOT NULL)
shift_schedules (branch_id BIGINT NOT NULL)
```

### 4.2 Gán context khi đăng nhập

Khi Staff đăng nhập, hệ thống inject `branch_id` vào JWT claims hoặc session context:

```go
// Middleware ví dụ — Gin
func BranchContextMiddleware() gin.HandlerFunc {
    return func(c *gin.Context) {
        claims := extractClaims(c) // từ JWT
        c.Set("branch_id", claims.BranchID)
        c.Set("role", claims.Role)
        c.Next()
    }
}
```

### 4.3 SQLC Query mẫu

Mọi query từ phía Store-level **phải** truyền `branch_id`:

```sql
-- name: GetOrdersByBranch :many
SELECT * FROM orders
WHERE branch_id = $1
  AND status = $2
ORDER BY created_at DESC;

-- name: GetInventoryByBranch :many
SELECT * FROM inventory
WHERE branch_id = $1
  AND product_id = $2;
```

---

## 5. Luồng nghiệp vụ chính

### 5.1 Luồng đặt hàng Online (E-commerce)

```
Khách đặt hàng (member)
    │
    ▼
[order module] Tạo đơn nháp → kiểm tra voucher (promotion module)
    │
    ▼
[order module] Order Routing:
    1. Lấy vị trí khách (địa chỉ giao / GPS)
    2. Query các chi nhánh trong bán kính X km (branch module)
    3. Kiểm tra tồn kho từng chi nhánh (inventory module)
    4. Gán đơn cho chi nhánh gần nhất CÓ ĐỦ hàng
    │
    ▼
[inventory module] Giữ tồn kho (soft reserve) — tránh oversell
    │
    ▼
[notification module] Bắn thông báo tới staff_cashier của chi nhánh được chọn
    │
    ▼
[staff_cashier] Xác nhận đơn → chuyển trạng thái "Đang chuẩn bị"
    │
    ▼
[baker] Nhận production list → làm bánh → cập nhật output
    │
    ▼
[shipper / 3rd party] Giao hàng → cập nhật "Đã giao thành công"
    │
    ▼
[inventory module] Trừ tồn kho thực tế (confirm deduction)
    │
    ▼
[loyalty module] Cộng điểm cho member
```

### 5.2 Luồng POS tại quầy

```
staff_cashier chọn sản phẩm → hệ thống check tồn kho branch
    │
    ▼
Lập hóa đơn (order module) → thanh toán (tiền mặt / QR)
    │
    ▼
inventory module trừ tồn kho realtime (branch_id)
    │
    ▼
Xuất hóa đơn / in bill
    │
    ▼ (nếu khách là member)
loyalty module cộng điểm
```

### 5.3 Luồng Quản lý Tồn kho

```
inventory_manager tạo đơn nhập hàng (PO) từ HQ
    │
    ▼
Hàng về chi nhánh → store_manager duyệt nhập kho lẻ
    │
    ▼
inventory module cập nhật tồn kho (+) cho branch
    │
    ▼
baker cập nhật sản phẩm ra lò → inventory (+) thành phẩm
    │
    ▼
Mỗi đơn hàng xử lý → inventory (-) nguyên liệu theo định mức (recipe)
```

---

## 6. Xử lý Tồn kho Realtime (Chống Oversell)

### Chiến lược: Pessimistic Locking + Soft Reserve

```sql
-- Bước 1: Soft reserve khi khách đặt online
UPDATE inventory
SET reserved_qty = reserved_qty + $qty
WHERE branch_id = $branch_id
  AND product_id = $product_id
  AND (available_qty - reserved_qty) >= $qty
RETURNING *;
-- Nếu 0 rows updated → hết hàng → routing sang chi nhánh khác

-- Bước 2: Confirm deduction khi giao hàng thành công
UPDATE inventory
SET available_qty = available_qty - $qty,
    reserved_qty  = reserved_qty  - $qty
WHERE branch_id = $branch_id
  AND product_id = $product_id;

-- Bước 3: Release reserve nếu đơn bị hủy
UPDATE inventory
SET reserved_qty = reserved_qty - $qty
WHERE branch_id = $branch_id
  AND product_id = $product_id;
```

### Cấu trúc bảng inventory

```sql
CREATE TABLE inventory (
    id            BIGSERIAL PRIMARY KEY,
    branch_id     BIGINT NOT NULL REFERENCES branches(id),
    product_id    BIGINT NOT NULL REFERENCES products(id),
    available_qty INT NOT NULL DEFAULT 0,
    reserved_qty  INT NOT NULL DEFAULT 0,  -- đang được giữ bởi đơn online
    unit          VARCHAR(20) NOT NULL,
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (branch_id, product_id)
);
```

---

## 7. Cấu trúc thư mục Module (Gợi ý)

```
/internal
  /auth
    handler.go
    service.go
    repository.go
    middleware.go
    permissions.go   ← định nghĩa hằng số permission
  /order
    handler.go
    service.go
    repository.go
    query/           ← file .sql cho sqlc
  /inventory
    ...
  /branch
    ...
  /product
    ...
  /promotion
    ...
  /notification
    ...
  /report
    ...
  /delivery
    ...
/pkg
  /middleware
    auth.go          ← BranchContextMiddleware, PermissionMiddleware
  /rbac
    rbac.go          ← kiểm tra permission động
```

### Ví dụ Permission Middleware (Gin)

```go
// pkg/middleware/auth.go

func RequirePermission(permission string) gin.HandlerFunc {
    return func(c *gin.Context) {
        role := c.GetString("role")
        if !rbac.HasPermission(role, permission) {
            c.AbortWithStatusJSON(403, gin.H{"error": "forbidden"})
            return
        }
        c.Next()
    }
}

// Dùng trong router:
// orderGroup.GET("/", RequirePermission("order:view:branch"), handler.ListOrders)
```

---

## 8. Bảng tóm tắt Role → Permission

| Role | Scope | Module chính |
|---|---|---|
| `super_admin` | all | Tất cả |
| `general_manager` | all | report, branch, order, promotion |
| `inventory_manager` | all | inventory, supplier |
| `marketing_manager` | all | ecommerce, promotion, product |
| `store_manager` | branch | user, inventory, report, order |
| `staff_cashier` | branch | order, product, customer |
| `baker` | branch | production, inventory |
| `shipper` | branch | delivery, order |
| `guest` | own | product, branch, cart |
| `member` | own | order, loyalty, review, profile |
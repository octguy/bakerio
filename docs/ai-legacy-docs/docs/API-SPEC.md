# Bakerio — API Specification

> Version 1.0 | 2026-03-03
> Base URL: `/api/v1`

---

## Conventions

### Authentication
All protected endpoints require:
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Expired JWT:** Returns `401 UNAUTHORIZED` with body `{ "error": { "code": "TOKEN_EXPIRED", "message": "Your session has expired. Please log in again." } }`. Frontend must catch this and redirect to login.

**Deactivated account:** Even with a valid non-expired JWT, if the user's `is_active = false` or `token_version` has been incremented, returns `401 UNAUTHORIZED` with code `ACCOUNT_DEACTIVATED`.

**Request size limit:** All endpoints reject bodies > 1MB with `413 PAYLOAD_TOO_LARGE`.

### Response Format

**Success:**
```json
{
  "data": { ... }
}
```

**Success (list):**
```json
{
  "data": [...],
  "meta": {
    "total": 100,
    "page": 1,
    "limit": 20
  }
}
```

**Error:**
```json
{
  "error": {
    "code": "VOUCHER_EXPIRED",
    "message": "This voucher expired on 2026-01-01."
  }
}
```

### Common Error Codes

| Code | HTTP | Meaning |
|---|---|---|
| UNAUTHORIZED | 401 | Missing or invalid JWT |
| FORBIDDEN | 403 | Role not permitted |
| NOT_FOUND | 404 | Resource not found |
| VALIDATION_ERROR | 422 | Invalid request body/params |
| CONFLICT | 409 | Resource state conflict |
| INTERNAL_ERROR | 500 | Unexpected server error |

### Pagination
`?page=1&limit=20` (defaults: page=1, limit=20, max limit=100)

### Timestamps
All timestamps in ISO 8601 UTC: `2026-03-03T10:00:00.000Z`

### IDs
UUID v4 strings.

---

## Role Abbreviations

- `[PUB]` — Public (no auth)
- `[CUST]` — Customer
- `[STAFF]` — Branch Staff
- `[DEL]` — Delivery Staff
- `[ADMIN]` — Admin
- `[ANY]` — Any authenticated user

---

## Auth

### POST `/auth/register` `[PUB]`
Register a new customer account.

**Request:**
```json
{
  "email": "jane@example.com",
  "password": "SecurePass123!",
  "full_name": "Jane Doe",
  "phone": "0901234567"
}
```

**Response `201`:**
```json
{
  "data": {
    "token": "<jwt>",
    "user": {
      "id": "uuid",
      "email": "jane@example.com",
      "full_name": "Jane Doe",
      "role": "CUSTOMER"
    }
  }
}
```

**Errors:** `VALIDATION_ERROR` (weak password, invalid email), `CONFLICT` (email already registered)

---

### POST `/auth/login` `[PUB]`
**Request:**
```json
{
  "email": "jane@example.com",
  "password": "SecurePass123!"
}
```

**Response `200`:**
```json
{
  "data": {
    "token": "<jwt>",
    "user": {
      "id": "uuid",
      "email": "jane@example.com",
      "full_name": "Jane Doe",
      "role": "CUSTOMER"
    }
  }
}
```

**Errors:** `UNAUTHORIZED` (invalid credentials)

---

### GET `/auth/me` `[ANY]`
Returns current user profile.

**Response `200`:**
```json
{
  "data": {
    "id": "uuid",
    "email": "jane@example.com",
    "full_name": "Jane Doe",
    "phone": "0901234567",
    "address": "123 Baker St",
    "role": "CUSTOMER",
    "created_at": "2026-01-01T00:00:00Z"
  }
}
```

---

### PATCH `/auth/me` `[ANY]`
Update own profile (name, phone, address).

**Allowed fields:** `full_name`, `phone`, `address` only. Any other fields (`role`, `email`, `is_active`, `password`) in the request body are **silently stripped** by the Zod schema before hitting the service — they do not cause an error but are never applied. This prevents role escalation.

**Request:**
```json
{
  "full_name": "Jane Smith",
  "phone": "0909999999",
  "address": "456 New St"
}
```

**Response `200`:** Updated user object (same shape as GET `/auth/me`).

**Response `422`:** `VALIDATION_ERROR` if phone is not a valid Vietnamese mobile number format.

---

## Branches

### GET `/branches` `[PUB]`
List all active branches.

**Query:** `?page&limit`

**Response `200`:**
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Bakerio District 1",
      "address": "12 Nguyen Hue, D1",
      "lat": 10.7769,
      "lng": 106.7009,
      "phone": "028-1234-5678",
      "operating_hours": {
        "mon": "08:00-22:00",
        "tue": "08:00-22:00",
        "sat": "07:00-23:00",
        "sun": "07:00-23:00"
      }
    }
  ],
  "meta": { "total": 5, "page": 1, "limit": 20 }
}
```

---

### GET `/branches/:id` `[PUB]`
Single branch detail.

---

### POST `/branches` `[ADMIN]`
**Request:**
```json
{
  "name": "Bakerio District 3",
  "address": "99 Vo Van Tan, D3",
  "lat": 10.7765,
  "lng": 106.6870,
  "phone": "028-9876-5432",
  "operating_hours": {
    "mon": "08:00-22:00"
  }
}
```
**Response `201`:** Branch object.

---

### PATCH `/branches/:id` `[ADMIN]`
Partial update. Any field from POST body.
**Response `200`:** Updated branch object.
**Response `404`:** Branch not found.

---

### DELETE `/branches/:id` `[ADMIN]`
Soft-delete (sets `is_active = false`). Does not delete any data.
**Response `204`** (no body)
**Response `404`:** Branch not found.
**Response `409 BRANCH_HAS_ACTIVE_ORDERS`:** Cannot deactivate a branch with orders in any non-terminal status.

---

## Products

### GET `/branches/:branchId/products` `[PUB]`
List products for a branch.

**Query:** `?category=CAKE&available=true&page&limit`

**Response `200`:**
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Classic Chocolate Cake",
      "description": "Rich chocolate sponge with buttercream",
      "base_price": 250000,
      "category": "CAKE",
      "is_available": true,
      "image_url": "https://...",
      "average_rating": 4.7,
      "review_count": 23,
      "option_groups": [
        {
          "id": "uuid",
          "name": "Size",
          "is_required": true,
          "is_multi_select": false,
          "options": [
            { "id": "uuid", "name": "15cm", "price_delta": 0, "image_url": null, "is_available": true },
            { "id": "uuid", "name": "20cm", "price_delta": 80000, "image_url": null, "is_available": true }
          ]
        }
      ]
    }
  ],
  "meta": { "total": 42, "page": 1, "limit": 20 }
}
```

---

### GET `/products/:id` `[PUB]`
Single product with full option groups.

---

### POST `/branches/:branchId/products` `[STAFF]`
Create a product for the staff's branch (branchId must match staff's assigned branch).

**Request:**
```json
{
  "name": "Custom Dream Cake",
  "description": "Build your perfect celebration cake",
  "base_price": 300000,
  "category": "CUSTOM",
  "image_url": "https://...",
  "option_groups": [
    {
      "name": "Size",
      "is_required": true,
      "is_multi_select": false,
      "sort_order": 1,
      "options": [
        { "name": "15cm", "price_delta": 0, "sort_order": 1 },
        { "name": "20cm", "price_delta": 80000, "sort_order": 2 }
      ]
    },
    {
      "name": "Add-on Decorations",
      "is_required": false,
      "is_multi_select": true,
      "sort_order": 6,
      "options": [
        { "name": "Edible Roses", "price_delta": 30000, "image_url": "https://...", "sort_order": 1 },
        { "name": "Gold Leaf", "price_delta": 50000, "image_url": "https://...", "sort_order": 2 },
        { "name": "Sprinkles", "price_delta": 15000, "sort_order": 3 }
      ]
    }
  ]
}
```
**Response `201`:** Full product object with option groups.

---

### PATCH `/products/:id` `[STAFF]`
Partial update (name, description, price, image). Cannot change `branch_id` or `category`.
**Response `200`:** Updated product.

---

### PATCH `/products/:id/availability` `[STAFF]`
**Request:**
```json
{ "is_available": false }
```
**Response `200`:** `{ "data": { "is_available": false } }`

---

### POST `/products/:id/option-groups` `[STAFF]`
Add an option group to a product.
**Response `201`:** Created option group.

---

### PATCH `/option-groups/:id` `[STAFF]`
Update option group (name, is_required, is_multi_select, sort_order).

---

### DELETE `/option-groups/:id` `[STAFF]`
Remove an option group (only if no orders reference its options).
**Response `204`**

---

### POST `/option-groups/:groupId/options` `[STAFF]`
Add an option to a group.
**Request:**
```json
{
  "name": "Fondant Figures",
  "price_delta": 45000,
  "image_url": "https://...",
  "sort_order": 4
}
```
**Response `201`:** Created option.

---

### PATCH `/options/:id` `[STAFF]`
Update option (name, price_delta, image_url, is_available, sort_order).

---

## Cart

### GET `/cart` `[CUST]`
Returns current user's cart.

**Response `200`:**
```json
{
  "data": {
    "id": "uuid",
    "branch_id": "uuid",
    "branch_name": "Bakerio District 1",
    "items": [
      {
        "id": "uuid",
        "product_id": "uuid",
        "product_name": "Classic Chocolate Cake",
        "product_image_url": "https://...",
        "selected_options": [
          { "group_name": "Size", "option_name": "20cm", "price_delta": 80000 },
          { "group_name": "Add-on Decorations", "option_name": "Edible Roses", "price_delta": 30000 }
        ],
        "quantity": 2,
        "unit_price": 360000,
        "line_total": 720000
      }
    ],
    "subtotal": 720000
  }
}
```

---

### POST `/cart/items` `[CUST]`
Add item to cart.

**Request:**
```json
{
  "product_id": "uuid",
  "quantity": 1,
  "selected_option_ids": ["size-uuid", "topping-uuid-1", "topping-uuid-2"]
}
```

**Response `201`:** Updated cart.

**Errors:**
- `VALIDATION_ERROR` — required option group not satisfied
- `CONFLICT` — product from different branch (`CART_BRANCH_MISMATCH`)
- `NOT_FOUND` — product not found or unavailable

---

### PATCH `/cart/items/:itemId` `[CUST]`
**Request:** `{ "quantity": 3 }` (quantity 0 = remove)
**Response `200`:** Updated cart.

---

### DELETE `/cart/items/:itemId` `[CUST]`
**Response `204`**

---

### DELETE `/cart` `[CUST]`
Clear entire cart (used when switching branches).
**Response `204`**

---

## Orders

### POST `/orders` `[CUST]`
Create an order from current cart.

**Request:**
```json
{
  "delivery_address": "456 Le Loi, D1",
  "voucher_code": "SUMMER20",
  "payment_method": "MOCK"
}
```

**Response `201`:**
```json
{
  "data": {
    "id": "uuid",
    "status": "PENDING_CONFIRMATION",
    "total_amount": 576000,
    "discount_amount": 144000,
    "payment_id": "uuid",
    "created_at": "2026-03-03T10:00:00Z"
  }
}
```

**Errors:**
- `CONFLICT` — cart is empty
- `VALIDATION_ERROR` — invalid delivery address
- Payment errors from gateway

---

### GET `/orders` `[CUST]`
Customer's order history.

**Query:** `?status=DELIVERED&page&limit`

**Response `200`:** Paginated order list (summary: id, status, total, branch name, created_at).

---

### GET `/orders/:id` `[CUST, STAFF, ADMIN]`
Full order detail.

**Response `200`:**
```json
{
  "data": {
    "id": "uuid",
    "status": "PREPARING",
    "branch": { "id": "uuid", "name": "Bakerio District 1", "phone": "..." },
    "delivery_address": "456 Le Loi, D1",
    "items": [
      {
        "product_name": "Classic Chocolate Cake",
        "selected_options_snapshot": [...],
        "quantity": 2,
        "unit_price": 360000,
        "line_total": 720000
      }
    ],
    "subtotal": 720000,
    "discount_amount": 144000,
    "total_amount": 576000,
    "voucher_code": "SUMMER20",
    "estimated_ready_at": "2026-03-03T11:30:00Z",
    "delivery_assignment": {
      "staff_name": "Minh Tran",
      "status": "OUT_FOR_DELIVERY",
      "picked_up_at": "2026-03-03T11:45:00Z"
    },
    "status_history": [
      { "status": "PENDING_CONFIRMATION", "at": "2026-03-03T10:00:00Z" },
      { "status": "CONFIRMED", "at": "2026-03-03T10:03:00Z" },
      { "status": "PREPARING", "at": "2026-03-03T10:15:00Z" }
    ],
    "created_at": "2026-03-03T10:00:00Z"
  }
}
```

---

### GET `/staff/orders` `[STAFF]`
Branch-scoped order queue.

**Query:** `?status=PENDING_CONFIRMATION&page&limit`

**Response `200`:** Paginated list of orders for staff's branch.

---

### PATCH `/orders/:id/confirm` `[STAFF]`
**Request:** `{ "estimated_ready_at": "2026-03-03T11:30:00Z" }`
**Response `200`:** Order with status `CONFIRMED`.
**Errors:** `CONFLICT` — order not in `PENDING_CONFIRMATION` state

---

### PATCH `/orders/:id/status` `[STAFF]`
Advance status. Staff can only move: `CONFIRMED → PREPARING → READY_FOR_PICKUP`.

Staff attempting any other transition (e.g., directly to `DELIVERED`) returns `422 INVALID_STATUS_TRANSITION`.

Staff attempting to update an order that belongs to a different branch returns `403 FORBIDDEN_BRANCH`.

**Request:** `{ "status": "PREPARING" }`
**Response `200`:** Updated order with new `status` and `updated_at`.
**Errors:**
- `422 INVALID_STATUS_TRANSITION` — attempted an illegal FSM move
- `403 FORBIDDEN_BRANCH` — order does not belong to this staff's branch
- `404 NOT_FOUND` — order ID not found

---

### PATCH `/orders/:id/reject` `[STAFF]`
**Request:** `{ "reason": "Ingredient unavailable for this order" }`
**Response `200`:** Order with status `CANCELLED`.

---

### POST `/orders/:id/reorder` `[CUST]`
Attempts to pre-fill cart with same items. Returns unavailability warnings.

**Response `200`:**
```json
{
  "data": {
    "cart": { ... },
    "warnings": [
      { "product_name": "Matcha Roll", "issue": "UNAVAILABLE" }
    ]
  }
}
```

---

## Custom Orders

### POST `/custom-orders` `[CUST]`
Submit a custom cake order.

**Request:**
```json
{
  "branch_id": "uuid",
  "base_product_id": "uuid",
  "selected_option_ids": ["size-uuid", "flavor-uuid", "frosting-uuid", "theme-uuid", "addon-uuid-1", "addon-uuid-2"],
  "inscription": "Happy Birthday Linh!",
  "desired_delivery_date": "2026-03-10"
}
```

**Validation:**
- All required option groups must be satisfied
- `desired_delivery_date` must be ≥ 48h from now
- `inscription` max 30 chars

**Response `201`:**
```json
{
  "data": {
    "id": "uuid",
    "status": "PENDING_REVIEW",
    "total_amount": 495000,
    "desired_delivery_date": "2026-03-10",
    "created_at": "..."
  }
}
```

---

### GET `/custom-orders/:id` `[CUST, STAFF, ADMIN]`
Full custom order detail including all selected options.

---

### GET `/customer/custom-orders` `[CUST]`
Customer's own custom order history.

---

### GET `/staff/custom-orders` `[STAFF]`
Branch-scoped custom order queue.

**Query:** `?status=PENDING_REVIEW&page&limit`

---

### PATCH `/custom-orders/:id/confirm` `[STAFF]`
Staff confirms the custom order is feasible.

**Response `200`:**
```json
{
  "data": {
    "id": "uuid",
    "status": "CONFIRMED_BY_STAFF",
    "deposit_amount": 148500,
    "total_amount": 495000
  }
}
```
Customer is now prompted to pay deposit.

---

### PATCH `/custom-orders/:id/reject` `[STAFF]`
**Request:** `{ "reason": "Selected decoration not available for this date" }`
**Response `200`:** Status `REJECTED_BY_STAFF`.

---

### PATCH `/custom-orders/:id/status` `[STAFF]`
Advance production status: `DEPOSIT_PAID → IN_PRODUCTION → READY_FOR_PICKUP`

**Request:** `{ "status": "IN_PRODUCTION" }`

---

## Payments

### POST `/payments` `[CUST]`
Process payment for an order or custom order deposit.

**Exactly one of `order_id` or `custom_order_id` must be provided.** Providing both, or neither, returns `422 VALIDATION_ERROR` with code `PAYMENT_TARGET_AMBIGUOUS`.

**Request (standard order):**
```json
{
  "order_id": "uuid",
  "method": "MOCK"
}
```

**Request (custom order deposit):**
```json
{
  "custom_order_id": "uuid",
  "method": "MOCK"
}
```

**Idempotency (Phase 2):** When using real gateways, include `Idempotency-Key: <uuid>` header. Duplicate requests with the same key return the original payment result without charging again. Not required for MOCK method.

**Response `201`:**
```json
{
  "data": {
    "id": "uuid",
    "status": "COMPLETED",
    "amount": 576000,
    "method": "MOCK",
    "paid_at": "2026-03-03T10:00:01Z"
  }
}
```

**Errors:** `CONFLICT` — order already paid, `PAYMENT_FAILED` (for real gateways)

---

### GET `/payments/:id` `[CUST, ADMIN]`
Payment record detail.

---

## Delivery

### GET `/delivery/pool` `[DEL]`
Available orders ready for pickup.

**Response `200`:**
```json
{
  "data": [
    {
      "order_id": "uuid",
      "order_type": "STANDARD",
      "branch": { "name": "Bakerio D1", "address": "12 Nguyen Hue" },
      "customer_address": "456 Le Loi, D1",
      "ready_since": "2026-03-03T11:30:00Z",
      "item_count": 2
    }
  ]
}
```

---

### POST `/delivery/assignments` `[DEL]`
Accept an assignment.

**Request:** `{ "order_id": "uuid" }`

**Response `201`:**
```json
{
  "data": {
    "id": "uuid",
    "order_id": "uuid",
    "status": "ASSIGNED"
  }
}
```

**Errors:**
- `409 ORDER_ALREADY_CLAIMED` — another delivery staff accepted this order in the same moment (race condition). Frontend should refresh the pool list and not retry with the same order ID.
- `409 ORDER_NOT_READY` — order is no longer in `READY_FOR_PICKUP` state (e.g., was cancelled by admin).

---

### GET `/delivery/assignments` `[DEL]`
Current delivery staff's active assignments.

---

### PATCH `/delivery/assignments/:id/status` `[DEL]`
**Request:** `{ "status": "PICKED_UP" }` | `"OUT_FOR_DELIVERY"` | `"DELIVERED"`
**Response `200`:** Updated assignment.

---

### PATCH `/delivery/assignments/:id/decline` `[DEL]`
**Response `200`:** Assignment status `DECLINED`; order returned to pool.

---

## Vouchers

### POST `/vouchers/validate` `[CUST]`
Check if a voucher is applicable before checkout.

**Request:**
```json
{
  "code": "SUMMER20",
  "order_subtotal": 720000,
  "branch_id": "uuid"
}
```

**Response `200`:**
```json
{
  "data": {
    "voucher_id": "uuid",
    "code": "SUMMER20",
    "discount_type": "PERCENTAGE",
    "discount_value": 20,
    "discount_amount": 144000,
    "final_amount": 576000
  }
}
```

**Errors:** `VOUCHER_EXPIRED` | `VOUCHER_LIMIT_REACHED` | `VOUCHER_ALREADY_USED` | `VOUCHER_MIN_ORDER_NOT_MET` | `VOUCHER_BRANCH_MISMATCH` | `NOT_FOUND`

---

### GET `/admin/vouchers` `[ADMIN]`
**Query:** `?active=true&page&limit`
**Response `200`:** Voucher list with `used_count`.

---

### POST `/admin/vouchers` `[ADMIN]`
**Request:**
```json
{
  "code": "SUMMER20",
  "discount_type": "PERCENTAGE",
  "discount_value": 20,
  "min_order_value": 200000,
  "max_uses": 500,
  "branch_id": null,
  "expires_at": "2026-06-30T23:59:59Z"
}
```
**Response `201`:** Created voucher.

---

### PATCH `/admin/vouchers/:id` `[ADMIN]`
Partial update (discount_value, min_order_value, max_uses, expires_at).

---

### PATCH `/admin/vouchers/:id/deactivate` `[ADMIN]`
**Response `200`:** `{ "data": { "is_active": false } }`

---

## Reviews

### POST `/reviews` `[CUST]`
**Request:**
```json
{
  "order_id": "uuid",
  "product_id": "uuid",
  "rating": 5,
  "comment": "Beautiful decoration and delicious!"
}
```
**Response `201`:** Created review.
**Errors:** `CONFLICT` — order not delivered, or review already exists for this order+product

---

### GET `/products/:id/reviews` `[PUB]`
**Query:** `?page&limit`
**Response `200`:** Review list (rating, comment, reviewer first name, created_at).

---

## Notifications

### GET `/notifications` `[ANY]`
**Query:** `?unread=true&page&limit`
**Response `200`:**
```json
{
  "data": [
    {
      "id": "uuid",
      "event": "ORDER_STATUS_CHANGED",
      "payload": { "order_id": "uuid", "new_status": "CONFIRMED" },
      "is_read": false,
      "created_at": "..."
    }
  ]
}
```

---

### PATCH `/notifications/:id/read` `[ANY]`
**Response `200`:** `{ "data": { "is_read": true } }`

---

### PATCH `/notifications/read-all` `[ANY]`
Mark all notifications as read.
**Response `204`**

---

## Admin — Staff Management

### POST `/admin/staff` `[ADMIN]`
Create a STAFF or DELIVERY_STAFF account.

**Request:**
```json
{
  "email": "staff@bakerio.vn",
  "password": "TempPass123!",
  "full_name": "Nguyen Van A",
  "phone": "0901111111",
  "role": "STAFF",
  "branch_id": "uuid"
}
```
**Response `201`:** User + BranchStaff record.

---

### GET `/admin/staff` `[ADMIN]`
**Query:** `?role=STAFF&branch_id=uuid&page&limit`
**Response `200`:** Staff list.

---

### PATCH `/admin/staff/:userId/deactivate` `[ADMIN]`
**Response `200`:** `{ "data": { "is_active": false } }`

---

## Admin — Reports

### GET `/admin/reports/overview` `[ADMIN]`
**Query:** `?from=2026-01-01&to=2026-03-03`
**Response `200`:**
```json
{
  "data": {
    "total_orders": 1240,
    "total_revenue": 186000000,
    "orders_by_status": {
      "DELIVERED": 1100,
      "CANCELLED": 80,
      "IN_PROGRESS": 60
    },
    "orders_by_branch": [
      { "branch_id": "uuid", "branch_name": "Bakerio D1", "order_count": 420, "revenue": 63000000 }
    ]
  }
}
```

---

### GET `/admin/reports/top-products` `[ADMIN]`
**Query:** `?from&to&branch_id&limit=10`
**Response `200`:**
```json
{
  "data": [
    { "product_id": "uuid", "product_name": "Classic Choc Cake", "order_count": 234, "revenue": 58500000 }
  ]
}
```

---

*API Spec v1.0 — all paths subject to change before Sprint 0 completion.*

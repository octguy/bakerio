# Bakerio — Business Domain Analysis

> Project 2 | E-Commerce System for Sweet Goods | Microservice Architecture  
> Team size: 2 people | Timeline: ~3.5 months

---

## What We're Building

A **multi-branch sweet goods platform** (think Domino's model, but for bakeries). A company runs **10+ physical branches** across a city. Customers order online from a branch near them. Staff at each branch manage products and fulfill orders. Delivery staff pick up and deliver.

**Product scope:** Cakes, cookies, pastries, and all sweet goods — excluding candy.

---

## Core Business Entities

| Entity | Description |
|---|---|
| **Branch** | A physical bakery location in the city. Has its own inventory, staff, and operating hours |
| **Product** | A cake, cookie, pastry, etc. Availability and price can vary by branch |
| **Customer** | Browses catalog, places orders, writes reviews, uses vouchers |
| **Baker / Staff** | Manages a branch's products, confirms and prepares orders |
| **Admin** | Manages branches, user accounts, and system-wide promotions |
| **Delivery Staff** | Picks up prepared orders and delivers to customers |
| **Order** | A transaction linking a customer, branch, products, and delivery |
| **Custom Order** | A special request (e.g. personalized cake) with a design/approval flow |
| **Voucher / Promotion** | Discount codes, flash sales, or branch-specific deals |
| **Review** | Rating and comment on a product or branch, submitted after order completion |

---

## User Roles

| Role | Responsibilities |
|---|---|
| **Customer** | Browse, order, pay, track, review |
| **Seller / Baker (Staff)** | Manage branch inventory, confirm and update order status |
| **Admin** | Manage branches, staff accounts, promotions, view reports |
| **Delivery Staff** | Receive pickup tasks, update delivery status |

---

## Core Business Flows

### 1. Standard Order Flow
```
Customer browses catalog (by branch or city map)
  → Adds products to cart
  → Applies voucher (optional)
  → Checks out + pays online
  → Branch staff confirms & prepares the order
  → Delivery staff picks up the order
  → Customer receives order
  → Customer leaves a review
```

### 2. Custom / Pre-order Flow
```
Customer submits a custom cake request
  (size, design description, desired delivery date, special notes)
  → Branch staff reviews the request and quotes a price
  → Customer confirms and pays a deposit
  → Staff prepares on the scheduled date
  → Delivery or customer pickup
```

### 3. Branch Staff Flow
```
Staff logs in to their branch dashboard
  → Manages product catalog: availability, pricing, stock
  → Views incoming standard and custom orders
  → Updates order status: Confirmed → Preparing → Ready for Pickup
```

### 4. Admin Flow
```
Admin logs in to the management dashboard
  → Creates and manages branch records
  → Manages staff accounts per branch
  → Creates system-wide or branch-specific promotions
  → Views reports: revenue, top products, order volume per branch
```

---

## Scope Risk Assessment

| Feature | Complexity | Risk Level |
|---|---|---|
| Multi-branch product catalog | Medium | Manageable |
| Auth with 4 roles (JWT / RBAC) | Medium | Manageable |
| Standard order + payment | High | Must-have — do this well |
| Custom / pre-order approval flow | **Very High** | Separate loop, deposit logic, scheduling |
| Reviews & ratings | Low | Easy — implement last |
| Promotions & vouchers | Medium | Can be simplified |
| Delivery staff status tracking | High | Real-time location is expensive in complexity |
| Per-branch inventory management | High | Easy to underestimate scope |

---

## Recommended Scope Tiers

### Tier 1 — Must Have *(core deliverable)*
- [ ] Authentication & authorization (all 4 roles, JWT + RBAC)
- [ ] Product catalog per branch (CRUD, availability toggle)
- [ ] Standard order flow (cart → checkout → status updates)
- [ ] Payment integration (mock or one real gateway: VNPay / Momo / Stripe)
- [ ] Order status management (staff dashboard)

### Tier 2 — Should Have *(targets a good grade)*
- [ ] Promotions & voucher codes
- [ ] Reviews & ratings (post-delivery)
- [ ] Custom / pre-order — **simplified**: request form + staff status update only (no deposit logic)

### Tier 3 — Nice to Have *(only if Tier 1 + 2 are solid)*
- [ ] Live delivery tracking / map view
- [ ] Branch revenue & analytics dashboard
- [ ] Full custom order with deposit payment and scheduling calendar

---

## Open Questions (to resolve before service design)

1. **Delivery model** — Is delivery handled by platform staff, or outsourced (Grab, Shopee Food style)?  
   - If outsourced: drop the Delivery Staff role entirely, use a tracking link → saves significant complexity.

2. **Custom order requirement** — Is this a hard requirement from the professor, or a team decision?  
   - It nearly doubles the complexity of the Order domain.

3. **Payment** — Real gateway integration or mocked payment flow?  
   - Integrating VNPay / Momo / Stripe takes meaningful time to get right.

---

*Resolving these three questions unlocks the microservice boundaries and data ownership design.*

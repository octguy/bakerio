-- name: GetOverview :one
-- Top-level KPI bundle for the super_admin dashboard. Subqueries (instead of
-- a giant CROSS JOIN) keep each count independent and self-explanatory; cost
-- is negligible at this data scale.
SELECT
    (SELECT COUNT(*) FROM auth.users u
       JOIN auth.user_roles ur ON ur.user_id = u.id
       JOIN auth.roles r       ON r.id      = ur.role_id
       WHERE r.name = 'customer')                              AS total_customers,
    (SELECT COUNT(*) FROM branch.branches)                     AS total_branches,
    (SELECT COUNT(*) FROM product.products
       WHERE deleted_at IS NULL)                               AS total_products,
    (SELECT COUNT(*) FROM orders.orders)                       AS total_orders,
    (SELECT COALESCE(SUM(total), 0)::numeric FROM orders.orders)          AS total_revenue,
    (SELECT COALESCE(SUM(discount_total), 0)::numeric FROM orders.orders) AS total_discount,
    (SELECT COUNT(*) FROM voucher.redemptions)                 AS vouchers_redeemed,
    (SELECT COUNT(*) FROM users.memberships WHERE tier = 'BRONZE') AS bronze_users,
    (SELECT COUNT(*) FROM users.memberships WHERE tier = 'SILVER') AS silver_users,
    (SELECT COUNT(*) FROM users.memberships WHERE tier = 'GOLD')   AS gold_users;

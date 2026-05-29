-- Branding website seed data.
-- Loads the mock locations/products from frontend/apps/web/src/data into PostgreSQL.
-- Safe to re-run: rows are matched by branch id and category/product slugs.

BEGIN;

INSERT INTO branch.branches (id, name, address, lat, lng, status)
VALUES
  ('10000000-0000-0000-0000-000000000001', 'Bakerio Nguyễn Huệ', '45 Nguyễn Huệ, Bến Nghé, Quận 1', 10.773800, 106.703000, 'active'),
  ('10000000-0000-0000-0000-000000000002', 'Bakerio Lê Lợi', '120 Lê Lợi, Bến Thành, Quận 1', 10.772500, 106.698000, 'active'),
  ('10000000-0000-0000-0000-000000000003', 'Bakerio Phú Mỹ Hưng', '18 Nguyễn Lương Bằng, Tân Phú, Quận 7', 10.729500, 106.718600, 'active'),
  ('10000000-0000-0000-0000-000000000004', 'Bakerio Crescent Mall', '101 Tôn Dật Tiên, Tân Phong, Quận 7', 10.729200, 106.719500, 'active'),
  ('10000000-0000-0000-0000-000000000005', 'Bakerio Võ Văn Ngân', '215 Võ Văn Ngân, Linh Chiểu, Thủ Đức', 10.851000, 106.759000, 'active'),
  ('10000000-0000-0000-0000-000000000006', 'Bakerio Gigamall', '240 Phạm Văn Đồng, Hiệp Bình Chánh, Thủ Đức', 10.838000, 106.710000, 'active')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  address = EXCLUDED.address,
  lat = EXCLUDED.lat,
  lng = EXCLUDED.lng,
  status = EXCLUDED.status;

WITH category_seed(id, name, slug, sort_order, is_active) AS (
  VALUES
    ('20000000-0000-0000-0000-000000000001'::uuid, 'Cakes', 'cakes', 1, TRUE),
    ('20000000-0000-0000-0000-000000000002'::uuid, 'Pastries', 'pastries', 2, TRUE),
    ('20000000-0000-0000-0000-000000000003'::uuid, 'Bread', 'bread', 3, TRUE),
    ('20000000-0000-0000-0000-000000000004'::uuid, 'Drinks', 'drinks', 4, TRUE)
)
INSERT INTO product.categories (id, name, slug, sort_order, is_active)
SELECT id, name, slug, sort_order, is_active
FROM category_seed
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  sort_order = EXCLUDED.sort_order,
  is_active = EXCLUDED.is_active,
  deleted_at = NULL,
  updated_at = NOW();

WITH product_seed(id, name, slug, category_slug, price, sort_order, is_active) AS (
  VALUES
    ('30000000-0000-0000-0000-000000000001'::uuid, 'Vanilla Sponge', 'vanilla-sponge', 'cakes', 185000.00, 1, TRUE),
    ('30000000-0000-0000-0000-000000000002'::uuid, 'Chocolate Fondant', 'chocolate-fondant', 'cakes', 148000.00, 2, TRUE),
    ('30000000-0000-0000-0000-000000000003'::uuid, 'Red Velvet', 'red-velvet', 'cakes', 175000.00, 3, TRUE),
    ('30000000-0000-0000-0000-000000000004'::uuid, 'Matcha Cheesecake', 'matcha-cheesecake', 'cakes', 155000.00, 4, TRUE),
    ('30000000-0000-0000-0000-000000000005'::uuid, 'Butter Croissant', 'butter-croissant', 'pastries', 45000.00, 5, TRUE),
    ('30000000-0000-0000-0000-000000000006'::uuid, 'Strawberry Tart', 'strawberry-tart', 'pastries', 128000.00, 6, TRUE),
    ('30000000-0000-0000-0000-000000000007'::uuid, 'Almond Danish', 'almond-danish', 'pastries', 65000.00, 7, TRUE),
    ('30000000-0000-0000-0000-000000000008'::uuid, 'Sourdough Loaf', 'sourdough-loaf', 'bread', 75000.00, 8, TRUE),
    ('30000000-0000-0000-0000-000000000009'::uuid, 'Baguette', 'baguette', 'bread', 35000.00, 9, TRUE),
    ('30000000-0000-0000-0000-000000000010'::uuid, 'Ciabatta', 'ciabatta', 'bread', 55000.00, 10, TRUE),
    ('30000000-0000-0000-0000-000000000011'::uuid, 'Iced Latte', 'iced-latte', 'drinks', 55000.00, 11, TRUE),
    ('30000000-0000-0000-0000-000000000012'::uuid, 'Matcha Latte', 'matcha-latte', 'drinks', 65000.00, 12, TRUE)
)
INSERT INTO product.products (id, name, slug, category_id, price, sort_order, is_active)
SELECT ps.id, ps.name, ps.slug, c.id, ps.price, ps.sort_order, ps.is_active
FROM product_seed ps
JOIN product.categories c ON c.slug = ps.category_slug
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  category_id = EXCLUDED.category_id,
  price = EXCLUDED.price,
  sort_order = EXCLUDED.sort_order,
  is_active = EXCLUDED.is_active,
  deleted_at = NULL,
  updated_at = NOW();

WITH image_seed(id, product_slug, image_url, alt_text, sort_order) AS (
  VALUES
    ('40000000-0000-0000-0000-000000000001'::uuid, 'vanilla-sponge', 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=600&q=80', 'Vanilla Sponge', 1),
    ('40000000-0000-0000-0000-000000000002'::uuid, 'chocolate-fondant', 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=600&q=80', 'Chocolate Fondant', 1),
    ('40000000-0000-0000-0000-000000000003'::uuid, 'red-velvet', 'https://images.unsplash.com/photo-1616541823729-00fe0aacd32c?w=600&q=80', 'Red Velvet', 1),
    ('40000000-0000-0000-0000-000000000004'::uuid, 'matcha-cheesecake', 'https://images.unsplash.com/photo-1556040220-4096d522378d?w=600&q=80', 'Matcha Cheesecake', 1),
    ('40000000-0000-0000-0000-000000000005'::uuid, 'butter-croissant', 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=600&q=80', 'Butter Croissant', 1),
    ('40000000-0000-0000-0000-000000000006'::uuid, 'strawberry-tart', 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=600&q=80', 'Strawberry Tart', 1),
    ('40000000-0000-0000-0000-000000000007'::uuid, 'almond-danish', 'https://images.unsplash.com/photo-1509365390695-33aee754301f?w=600&q=80', 'Almond Danish', 1),
    ('40000000-0000-0000-0000-000000000008'::uuid, 'sourdough-loaf', 'https://images.unsplash.com/photo-1585478259715-876acc5be8eb?w=600&q=80', 'Sourdough Loaf', 1),
    ('40000000-0000-0000-0000-000000000009'::uuid, 'baguette', 'https://images.unsplash.com/photo-1549931319-a545dcf3bc73?w=600&q=80', 'Baguette', 1),
    ('40000000-0000-0000-0000-000000000010'::uuid, 'ciabatta', 'https://images.unsplash.com/photo-1586444248879-bc604bc77dac?w=600&q=80', 'Ciabatta', 1),
    ('40000000-0000-0000-0000-000000000011'::uuid, 'iced-latte', 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=600&q=80', 'Iced Latte', 1),
    ('40000000-0000-0000-0000-000000000012'::uuid, 'matcha-latte', 'https://images.unsplash.com/photo-1536256263959-770b48d82b0a?w=600&q=80', 'Matcha Latte', 1)
)
INSERT INTO product.product_images (id, product_id, image_url, alt_text, sort_order)
SELECT i.id, p.id, i.image_url, i.alt_text, i.sort_order
FROM image_seed i
JOIN product.products p ON p.slug = i.product_slug
ON CONFLICT (id) DO UPDATE SET
  product_id = EXCLUDED.product_id,
  image_url = EXCLUDED.image_url,
  alt_text = EXCLUDED.alt_text,
  sort_order = EXCLUDED.sort_order,
  updated_at = NOW();

INSERT INTO product.branch_products (product_id, branch_id, is_active)
SELECT p.id, b.id, TRUE
FROM product.products p
CROSS JOIN branch.branches b
WHERE p.slug IN (
    'vanilla-sponge',
    'chocolate-fondant',
    'red-velvet',
    'matcha-cheesecake',
    'butter-croissant',
    'strawberry-tart',
    'almond-danish',
    'sourdough-loaf',
    'baguette',
    'ciabatta',
    'iced-latte',
    'matcha-latte'
  )
  AND b.id BETWEEN '10000000-0000-0000-0000-000000000001' AND '10000000-0000-0000-0000-000000000006'
ON CONFLICT (product_id, branch_id) DO UPDATE SET
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

COMMIT;

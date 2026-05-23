-- E2E test seed data
TRUNCATE product.categories CASCADE;
TRUNCATE branch.branches CASCADE;

INSERT INTO branch.branches (id, name, address, lat, lng, status) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Bakerio Quận 1', '65 Lê Lợi, Quận 1', 10.77, 106.70, 'active'),
  ('00000000-0000-0000-0000-000000000002', 'Bakerio Hoàn Kiếm', '12 Hàng Bài, Hoàn Kiếm', 21.02, 105.85, 'active');

INSERT INTO product.categories (id, name, slug, sort_order, is_active) VALUES
  ('00000000-0000-0000-0000-000000000011', 'Cakes', 'cakes', 1, true),
  ('00000000-0000-0000-0000-000000000012', 'Pastries', 'pastries', 2, true);


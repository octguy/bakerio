DELETE FROM auth.roles WHERE name IN (
  'super_admin', 'product_manager', 'branch_manager', 'branch_staff', 'customer', 'guest'
);

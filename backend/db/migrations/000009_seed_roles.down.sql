DELETE FROM auth.roles WHERE name IN (
  'super_admin', 'general_manager', 'inventory_manager', 'marketing_manager',
  'store_manager', 'staff_cashier', 'baker', 'shipper', 'guest', 'member'
);

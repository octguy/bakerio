INSERT INTO auth.roles (name, description) VALUES
('super_admin',     'Full system administrator'),
('product_manager', 'Manages products and vouchers system-wide'),
('branch_manager',  'Manages a single branch, its staff and its orders'),
('branch_staff',    'Branch staff — confirms, prepares and delivers orders'),
('customer',        'Registered customer'),
('guest',           'Unauthenticated visitor');

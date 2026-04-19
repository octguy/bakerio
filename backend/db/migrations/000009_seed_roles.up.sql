INSERT INTO auth.roles (name, description) VALUES
('super_admin',        'Full system administrator with access to all modules'),
('general_manager',    'Chain director with system-wide visibility'),
('inventory_manager',  'Central warehouse manager at HQ'),
('marketing_manager',  'E-commerce and Marketing manager'),
('store_manager',      'Branch manager responsible for one specific branch'),
('staff_cashier',      'Sales staff and cashier at branch'),
('baker',              'Baker and production staff at branch'),
('shipper',            'Delivery staff — in-house fleet'),
('guest',              'Unauthenticated visitor'),
('member',             'Registered customer');

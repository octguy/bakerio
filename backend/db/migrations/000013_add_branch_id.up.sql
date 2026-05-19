ALTER TABLE auth.users 
ADD COLUMN branch_id UUID REFERENCES branch.branches(id) ON DELETE SET NULL;
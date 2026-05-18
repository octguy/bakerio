ALTER TABLE branch.branches
ADD COLUMN deleted_at TIMESTAMPTZ,
ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
ADD COLUMN updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION branch.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_branches_updated_at
BEFORE UPDATE ON branch.branches
FOR EACH ROW
EXECUTE FUNCTION branch.update_updated_at_column();

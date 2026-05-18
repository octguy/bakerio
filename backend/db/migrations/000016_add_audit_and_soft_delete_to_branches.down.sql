DROP TRIGGER IF EXISTS update_branches_updated_at ON branch.branches;
DROP FUNCTION IF EXISTS branch.update_updated_at_column();

ALTER TABLE branch.branches
DROP COLUMN IF EXISTS created_by,
DROP COLUMN IF EXISTS updated_by,
DROP COLUMN IF EXISTS updated_at,
DROP COLUMN IF EXISTS deleted_at;

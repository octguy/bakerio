ALTER TABLE auth.auth_credentials
DROP COLUMN IF EXISTS created_by,
DROP COLUMN IF EXISTS updated_by;

ALTER TABLE auth.users
DROP COLUMN IF EXISTS created_by,
DROP COLUMN IF EXISTS updated_by;

ALTER TABLE auth.users
ADD COLUMN created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE auth.auth_credentials
ADD COLUMN created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

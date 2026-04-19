-- All roles in the system (seeded, not user-created)
CREATE TABLE auth.roles
(
   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
   name VARCHAR(50) UNIQUE NOT NULL,  -- e.g. "super_admin", "member"
   description TEXT
);

-- All named permissions (seeded)
CREATE TABLE auth.permissions
(
    id     UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    name   VARCHAR(100) UNIQUE NOT NULL  -- e.g. "order:create:branch"
);

-- Which permissions belong to which role (seeded)
CREATE TABLE auth.role_permissions
(
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_id UUID NOT NULL,
    permission_id UUID NOT NULL,

    CONSTRAINT fk_role_permissions_role
        FOREIGN KEY (role_id) REFERENCES auth.roles (id) ON DELETE CASCADE,
    CONSTRAINT fk_role_permissions_permission
        FOREIGN KEY (permission_id) REFERENCES auth.permissions (id) ON DELETE CASCADE,

    CONSTRAINT role_permissions_unique UNIQUE (role_id, permission_id)
);

-- Which roles a user has (runtime — assigned by admin)
CREATE TABLE auth.user_roles
(
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    role_id UUID NOT NULL,

    CONSTRAINT fk_user_roles_user
        FOREIGN KEY (user_id) REFERENCES auth.users (id) ON DELETE CASCADE,
    CONSTRAINT fk_user_roles_role
        FOREIGN KEY (role_id) REFERENCES auth.roles (id) ON DELETE CASCADE,
    CONSTRAINT user_roles_unique UNIQUE (user_id, role_id)
);

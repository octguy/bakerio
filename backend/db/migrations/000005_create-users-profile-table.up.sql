CREATE TABLE users.profiles (
    id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       UUID         NOT NULL UNIQUE,         -- 1:1 with auth.users.id; no cross-schema FK
    display_name  VARCHAR(100) NOT NULL,
    phone         VARCHAR(20)  NULL,
    address       VARCHAR(500) NULL,                    -- single free-text default delivery address
    avatar_url    TEXT         NULL,
    bio           TEXT         NULL,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

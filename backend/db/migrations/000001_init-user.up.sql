-- ============================================================
-- USERS
-- Core identity table — keep it lean
-- ============================================================

CREATE TABLE users (
    id                UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    email             VARCHAR(255)    NOT NULL,
    email_verified    BOOLEAN         NOT NULL DEFAULT FALSE,
    is_active         BOOLEAN         NOT NULL DEFAULT TRUE,
    deleted_at        TIMESTAMPTZ     NULL,           -- soft delete
    created_at        TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
 
    CONSTRAINT users_email_unique UNIQUE (email)
);
 
-- ============================================================
-- PROFILES
-- Display / public-facing data, separate from auth concerns
-- ============================================================
 
CREATE TABLE profiles (
    id              UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID            NOT NULL,
    display_name    VARCHAR(100)    NULL,
    avatar_url      TEXT            NULL,
    bio             TEXT            NULL,
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
 
    CONSTRAINT fk_profiles_user
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT profiles_user_id_unique UNIQUE (user_id)
);
 
-- ============================================================
-- AUTH CREDENTIALS
-- Password-based login — only exists if user chose password auth
-- ============================================================
 
CREATE TABLE auth_credentials (
    id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id                 UUID        NOT NULL,
    password_hash           TEXT        NOT NULL,           -- bcrypt / argon2id hash
    password_changed_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 
    CONSTRAINT fk_auth_creds_user
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT auth_credentials_user_id_unique UNIQUE (user_id)
);
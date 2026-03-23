CREATE TABLE auth.users (
    id                UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    email             VARCHAR(255)    NOT NULL,
    email_verified    BOOLEAN         NOT NULL DEFAULT FALSE,
    is_active         BOOLEAN         NOT NULL DEFAULT FALSE,
    deleted_at        TIMESTAMPTZ     NULL,           -- soft delete
    created_at        TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

    CONSTRAINT users_email_unique UNIQUE (email)
);

CREATE TABLE profile.profiles (
    id              UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID            NOT NULL,
    display_name    VARCHAR(100)    NOT NULL,
    avatar_url      TEXT            NULL,
    bio             TEXT            NULL,
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

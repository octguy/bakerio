-- Address catalog per user. A user may save many addresses; at most one is
-- the default (used to pre-fill the shipping address at order checkout).
-- Orders snapshot the address text + lat/lng onto the order row itself, so
-- the catalog can be edited or deleted without rewriting placed orders.
CREATE TABLE users.addresses (
    id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID         NOT NULL,                       -- references auth.users.id (no cross-schema FK)
    label       VARCHAR(50)  NULL,                           -- optional: "Home", "Office"
    address     VARCHAR(500) NOT NULL,                       -- free-text postal address
    latitude    NUMERIC(9,6) NOT NULL,
    longitude   NUMERIC(9,6) NOT NULL,
    is_default  BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    deleted_at  TIMESTAMPTZ  NULL
);

-- At most one default address per user, among live rows.
CREATE UNIQUE INDEX uq_users_addresses_one_default_per_user
    ON users.addresses (user_id)
    WHERE is_default AND deleted_at IS NULL;

CREATE INDEX idx_users_addresses_user_live
    ON users.addresses (user_id)
    WHERE deleted_at IS NULL;

-- Profile no longer holds an address: the catalog replaces it.
ALTER TABLE users.profiles DROP COLUMN address;

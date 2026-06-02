DROP INDEX IF EXISTS users.uq_users_addresses_one_default_per_user;
DROP INDEX IF EXISTS users.idx_users_addresses_user;

ALTER TABLE users.addresses ADD COLUMN deleted_at TIMESTAMPTZ NULL;

CREATE UNIQUE INDEX uq_users_addresses_one_default_per_user
    ON users.addresses (user_id)
    WHERE is_default AND deleted_at IS NULL;

CREATE INDEX idx_users_addresses_user_live
    ON users.addresses (user_id)
    WHERE deleted_at IS NULL;

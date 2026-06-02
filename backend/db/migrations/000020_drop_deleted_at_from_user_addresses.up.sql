-- Switching to hard delete for users.addresses. Orders snapshot the address
-- text + lat/lng on the order row, so removing a catalog entry never breaks
-- placed orders. The deleted_at column + its index predicates are no longer
-- meaningful.

DROP INDEX IF EXISTS users.uq_users_addresses_one_default_per_user;
DROP INDEX IF EXISTS users.idx_users_addresses_user_live;

ALTER TABLE users.addresses DROP COLUMN deleted_at;

CREATE UNIQUE INDEX uq_users_addresses_one_default_per_user
    ON users.addresses (user_id)
    WHERE is_default;

CREATE INDEX idx_users_addresses_user
    ON users.addresses (user_id);

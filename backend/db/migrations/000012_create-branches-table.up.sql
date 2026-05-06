CREATE TABLE core.branches (
    id         UUID PRIMARY KEY,
    name       VARCHAR(100) NOT NULL,
    address    TEXT NOT NULL,
    lat        DECIMAL(9,6),
    lng        DECIMAL(9,6),
    status     VARCHAR(20) NOT NULL DEFAULT 'active',  -- 'active' | 'inactive'
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_branches_status ON core.branches(status);
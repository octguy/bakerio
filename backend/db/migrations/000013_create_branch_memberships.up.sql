CREATE TABLE branch.branch_memberships (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID        NOT NULL UNIQUE,                       -- 1:1 with auth.users.id, no cross-schema FK
    branch_id   UUID        NOT NULL REFERENCES branch.branches(id),  -- same schema, FK OK
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_branch_memberships_branch ON branch.branch_memberships(branch_id);

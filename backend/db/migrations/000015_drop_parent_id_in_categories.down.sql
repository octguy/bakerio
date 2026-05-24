-- Re-add the parent_id column
ALTER TABLE product.categories
    ADD COLUMN parent_id UUID;

-- Re-apply the self-referencing foreign key constraint
ALTER TABLE product.categories
    ADD CONSTRAINT categories_parent_id_fkey
        FOREIGN KEY (parent_id) REFERENCES product.categories(id) ON DELETE SET NULL;

-- Re-create the partial index
CREATE INDEX idx_categories_parent
    ON product.categories(parent_id) WHERE deleted_at IS NULL;
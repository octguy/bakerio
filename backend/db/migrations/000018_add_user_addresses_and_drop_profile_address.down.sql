ALTER TABLE users.profiles ADD COLUMN address VARCHAR(500) NULL;

DROP TABLE IF EXISTS users.addresses;

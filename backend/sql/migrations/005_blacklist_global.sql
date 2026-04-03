-- Global blacklist: hotel_id optional; one row per id_number system-wide.
-- Run after schema.sql / prior migrations on existing databases.

BEGIN;

-- Keep a single row per id_number (oldest wins) before adding global uniqueness.
DELETE FROM blacklist
WHERE id NOT IN (
  SELECT id FROM (
    SELECT DISTINCT ON (id_number) id
    FROM blacklist
    ORDER BY id_number, created_at ASC NULLS LAST, id ASC
  ) keepers
);

ALTER TABLE blacklist DROP CONSTRAINT IF EXISTS blacklist_hotel_id_number_uniq;

ALTER TABLE blacklist ALTER COLUMN hotel_id DROP NOT NULL;

-- Safe to re-run: drop first so ADD does not fail if migration was partially applied before.
ALTER TABLE blacklist DROP CONSTRAINT IF EXISTS blacklist_id_number_uniq;

ALTER TABLE blacklist ADD CONSTRAINT blacklist_id_number_uniq UNIQUE (id_number);

COMMIT;

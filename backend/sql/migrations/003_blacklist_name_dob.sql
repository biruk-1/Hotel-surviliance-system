-- Adds name and date_of_birth to blacklist for existing databases.
ALTER TABLE blacklist ADD COLUMN IF NOT EXISTS full_name VARCHAR(255);
ALTER TABLE blacklist ADD COLUMN IF NOT EXISTS date_of_birth DATE;

UPDATE blacklist
SET full_name = 'Unknown'
WHERE full_name IS NULL OR BTRIM(COALESCE(full_name, '')) = '';

ALTER TABLE blacklist ALTER COLUMN full_name SET NOT NULL;

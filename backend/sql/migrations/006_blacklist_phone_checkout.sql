-- Optional contact and planned departure metadata on blacklist rows.
-- Run after prior migrations on existing databases.

ALTER TABLE blacklist ADD COLUMN IF NOT EXISTS phone VARCHAR(50);
ALTER TABLE blacklist ADD COLUMN IF NOT EXISTS checkout_date DATE;

-- Hotel Surveillance System — PostgreSQL schema
-- Requires PostgreSQL 13+ for gen_random_uuid() without extra extensions.

-- -----------------------------------------------------------------------------
-- Helper: keep updated_at in sync
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- -----------------------------------------------------------------------------
-- Alerts: stay must belong to hotel_id; guest must match stay when both set
-- (CHECK cannot use subqueries in PostgreSQL; use trigger instead.)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION validate_alerts_integrity()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.stay_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM stays s
      WHERE s.id = NEW.stay_id AND s.hotel_id = NEW.hotel_id
    ) THEN
      RAISE EXCEPTION 'alerts.stay_id must reference a stay for the same hotel_id';
    END IF;
  END IF;
  IF NEW.stay_id IS NOT NULL AND NEW.guest_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM stays s
      WHERE s.id = NEW.stay_id AND s.guest_id = NEW.guest_id
    ) THEN
      RAISE EXCEPTION 'alerts.guest_id must match the guest on alerts.stay_id when both are set';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- -----------------------------------------------------------------------------
-- users — application accounts (staff / operators)
-- -----------------------------------------------------------------------------
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'hotel' CHECK (role IN ('hotel', 'police', 'admin')),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

-- -----------------------------------------------------------------------------
-- hotels
-- -----------------------------------------------------------------------------
CREATE TABLE hotels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  address_line1 VARCHAR(500),
  city VARCHAR(120),
  country VARCHAR(120),
  phone VARCHAR(50),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_hotels_updated_at
  BEFORE UPDATE ON hotels
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

-- -----------------------------------------------------------------------------
-- hotel_users — membership: which user works at which hotel (no orphan rows)
-- -----------------------------------------------------------------------------
CREATE TABLE hotel_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  hotel_id UUID NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  role VARCHAR(80) NOT NULL DEFAULT 'staff',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT hotel_users_user_hotel_uniq UNIQUE (user_id, hotel_id)
);

CREATE INDEX idx_hotel_users_user_id ON hotel_users (user_id);
CREATE INDEX idx_hotel_users_hotel_id ON hotel_users (hotel_id);

CREATE TRIGGER trg_hotel_users_updated_at
  BEFORE UPDATE ON hotel_users
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

-- -----------------------------------------------------------------------------
-- guests — people checked in / monitored (parent for stays)
-- -----------------------------------------------------------------------------
CREATE TABLE guests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name VARCHAR(255) NOT NULL,
  id_number VARCHAR(120) NOT NULL,
  date_of_birth DATE,
  phone VARCHAR(50),
  email VARCHAR(255),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_guests_full_name ON guests (full_name);
CREATE INDEX idx_guests_id_number ON guests (id_number);

CREATE TRIGGER trg_guests_updated_at
  BEFORE UPDATE ON guests
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

-- -----------------------------------------------------------------------------
-- stays — a guest stay at a hotel (documents & many alerts attach here)
-- -----------------------------------------------------------------------------
CREATE TABLE stays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guest_id UUID NOT NULL REFERENCES guests(id) ON DELETE RESTRICT,
  hotel_id UUID NOT NULL REFERENCES hotels(id) ON DELETE RESTRICT,
  created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  check_in TIMESTAMPTZ NOT NULL,
  check_out TIMESTAMPTZ,
  room_number VARCHAR(50),
  status VARCHAR(50) NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT stays_check_out_after_check_in_chk
    CHECK (check_out IS NULL OR check_out >= check_in)
);

CREATE INDEX idx_stays_check_in ON stays (check_in);
CREATE INDEX idx_stays_guest_id ON stays (guest_id);
CREATE INDEX idx_stays_hotel_id ON stays (hotel_id);

CREATE TRIGGER trg_stays_updated_at
  BEFORE UPDATE ON stays
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

-- -----------------------------------------------------------------------------
-- documents — files tied to a stay (cannot exist without stay / guest / hotel chain)
-- -----------------------------------------------------------------------------
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stay_id UUID NOT NULL REFERENCES stays(id) ON DELETE CASCADE,
  uploaded_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  title VARCHAR(255) NOT NULL,
  storage_key VARCHAR(1024) NOT NULL,
  mime_type VARCHAR(120),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_documents_stay_id ON documents (stay_id);

CREATE TRIGGER trg_documents_updated_at
  BEFORE UPDATE ON documents
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

-- -----------------------------------------------------------------------------
-- blacklist — global registry (hotel_id optional for legacy rows; unique id_number)
-- -----------------------------------------------------------------------------
CREATE TABLE blacklist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id UUID REFERENCES hotels(id) ON DELETE CASCADE,
  full_name VARCHAR(255) NOT NULL,
  id_number VARCHAR(120) NOT NULL,
  date_of_birth DATE,
  reason TEXT,
  created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT blacklist_id_number_uniq UNIQUE (id_number)
);

CREATE INDEX idx_blacklist_id_number ON blacklist (id_number);
CREATE INDEX idx_blacklist_hotel_id ON blacklist (hotel_id);

CREATE TRIGGER trg_blacklist_updated_at
  BEFORE UPDATE ON blacklist
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

-- -----------------------------------------------------------------------------
-- alerts — operational alerts (must belong to a hotel; optional stay/guest link)
-- -----------------------------------------------------------------------------
CREATE TABLE alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id UUID NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  stay_id UUID REFERENCES stays(id) ON DELETE SET NULL,
  guest_id UUID REFERENCES guests(id) ON DELETE SET NULL,
  created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  severity VARCHAR(40) NOT NULL DEFAULT 'info',
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  acknowledged_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_alerts_hotel_id ON alerts (hotel_id);
CREATE INDEX idx_alerts_stay_id ON alerts (stay_id) WHERE stay_id IS NOT NULL;
CREATE INDEX idx_alerts_guest_id ON alerts (guest_id) WHERE guest_id IS NOT NULL;
CREATE INDEX idx_alerts_created_at ON alerts (created_at);

CREATE TRIGGER trg_alerts_integrity
  BEFORE INSERT OR UPDATE ON alerts
  FOR EACH ROW EXECUTE PROCEDURE validate_alerts_integrity();

CREATE TRIGGER trg_alerts_updated_at
  BEFORE UPDATE ON alerts
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

-- -----------------------------------------------------------------------------
-- audit_logs — append-only style audit trail (optional FKs; preserve rows on delete)
-- -----------------------------------------------------------------------------
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  hotel_id UUID REFERENCES hotels(id) ON DELETE SET NULL,
  action VARCHAR(120) NOT NULL,
  entity_type VARCHAR(120) NOT NULL,
  entity_id UUID NOT NULL,
  metadata JSONB,
  ip_address INET,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_entity ON audit_logs (entity_type, entity_id);
CREATE INDEX idx_audit_logs_actor_user_id ON audit_logs (actor_user_id) WHERE actor_user_id IS NOT NULL;
CREATE INDEX idx_audit_logs_hotel_id ON audit_logs (hotel_id) WHERE hotel_id IS NOT NULL;
CREATE INDEX idx_audit_logs_created_at ON audit_logs (created_at);

-- -----------------------------------------------------------------------------
-- Notes on integrity
-- -----------------------------------------------------------------------------
-- * hotel_users: CASCADE from users/hotels removes membership rows (no orphans).
-- * stays: RESTRICT on guest/hotel — delete or archive guests/hotels only after
--   stays are removed or reassigned (prevents orphan stays).
-- * documents: CASCADE from stay — deleting a stay removes its documents.
-- * blacklist: CASCADE from hotel — removing a hotel removes its blacklist rows.
-- * alerts: CASCADE from hotel; SET NULL on stay/guest when those rows go away;
--   validate_alerts_integrity() keeps stay/guest aligned with hotel when set.
-- * audit_logs: SET NULL on user/hotel delete so history remains.

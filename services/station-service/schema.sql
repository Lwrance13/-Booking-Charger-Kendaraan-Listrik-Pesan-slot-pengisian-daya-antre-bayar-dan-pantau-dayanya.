-- station-service database schema
CREATE TABLE IF NOT EXISTS stations (
  id            VARCHAR(10)  PRIMARY KEY,
  name          VARCHAR(200) NOT NULL,
  location      TEXT,
  city          VARCHAR(100),
  province      VARCHAR(100),
  latitude      DECIMAL(10,6),
  longitude     DECIMAL(10,6),
  status        VARCHAR(20)  NOT NULL DEFAULT 'active',
  operator_id   VARCHAR(50),
  total_slots   INTEGER      DEFAULT 0,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS slots (
  id             VARCHAR(10) PRIMARY KEY,
  station_id     VARCHAR(10) NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
  connector_type VARCHAR(20) NOT NULL,
  power_kw       INTEGER     NOT NULL,
  slot_status    VARCHAR(20) NOT NULL DEFAULT 'available',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tariffs (
  id             SERIAL      PRIMARY KEY,
  slot_id        VARCHAR(10) NOT NULL REFERENCES slots(id) ON DELETE CASCADE,
  price_per_kwh  INTEGER     NOT NULL,
  currency       VARCHAR(3)  NOT NULL DEFAULT 'IDR',
  effective_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  effective_to   TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$ LANGUAGE plpgsql;

CREATE TRIGGER stations_updated_at BEFORE UPDATE ON stations FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER slots_updated_at    BEFORE UPDATE ON slots    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX idx_slots_station_id ON slots(station_id);
CREATE INDEX idx_slots_status     ON slots(slot_status);
CREATE INDEX idx_tariffs_slot_id  ON tariffs(slot_id);

-- booking-service database schema
CREATE TABLE IF NOT EXISTS bookings (
  id              VARCHAR(10)  PRIMARY KEY,
  user_id         VARCHAR(20)  NOT NULL,
  station_id      VARCHAR(10)  NOT NULL,
  slot_id         VARCHAR(10)  NOT NULL,
  booking_time    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  scheduled_start TIMESTAMPTZ  NOT NULL,
  scheduled_end   TIMESTAMPTZ  NOT NULL,
  status          VARCHAR(20)  NOT NULL DEFAULT 'pending',
  qr_code         VARCHAR(100),
  tariff_per_kwh  INTEGER,
  cancel_reason   VARCHAR(100),
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Cron job tracker: lepas slot bila user tak datang +15 menit (ADR no-show policy)
CREATE TABLE IF NOT EXISTS no_show_jobs (
  id          SERIAL      PRIMARY KEY,
  booking_id  VARCHAR(10) NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  release_at  TIMESTAMPTZ NOT NULL,
  status      VARCHAR(20) NOT NULL DEFAULT 'pending',
  executed_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Cache Idempotency-Key agar POST /bookings aman di-retry
CREATE TABLE IF NOT EXISTS idempotency_keys (
  key               VARCHAR(200) PRIMARY KEY,
  response_snapshot JSONB        NOT NULL,
  created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$ LANGUAGE plpgsql;

CREATE TRIGGER bookings_updated_at BEFORE UPDATE ON bookings FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX idx_bookings_user_id     ON bookings(user_id);
CREATE INDEX idx_bookings_slot_id     ON bookings(slot_id);
CREATE INDEX idx_bookings_status      ON bookings(status);
CREATE INDEX idx_bookings_sched_start ON bookings(scheduled_start);
CREATE INDEX idx_no_show_release_at   ON no_show_jobs(release_at) WHERE status = 'pending';

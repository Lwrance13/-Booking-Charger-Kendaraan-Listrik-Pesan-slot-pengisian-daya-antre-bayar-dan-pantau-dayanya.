-- session-service database schema — menggunakan TimescaleDB
CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;

CREATE TABLE IF NOT EXISTS sessions (
  id             VARCHAR(10)   PRIMARY KEY,
  booking_id     VARCHAR(10)   NOT NULL,
  user_id        VARCHAR(20)   NOT NULL,
  slot_id        VARCHAR(10)   NOT NULL,
  station_id     VARCHAR(10)   NOT NULL,
  connector_id   VARCHAR(50),
  started_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  ended_at       TIMESTAMPTZ,
  meter_start    DECIMAL(12,3),
  meter_end      DECIMAL(12,3),
  kwh_used       DECIMAL(10,3),
  duration_min   INTEGER,
  status         VARCHAR(20)   NOT NULL DEFAULT 'active',
  tariff_per_kwh INTEGER,
  power_kw       INTEGER       DEFAULT 22,
  created_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- TimescaleDB hypertable: volume tulis 100x lebih tinggi dari booking (ADR-001)
-- Partisi otomatis per waktu untuk efisiensi query IoT
CREATE TABLE IF NOT EXISTS power_readings (
  id             BIGSERIAL,
  session_id     VARCHAR(10)   NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  recorded_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  cumulative_kwh DECIMAL(12,3),
  power_w        INTEGER,
  PRIMARY KEY (id, recorded_at)
);

SELECT create_hypertable('power_readings', 'recorded_at', if_not_exists => TRUE);

CREATE INDEX idx_sessions_booking_id ON sessions(booking_id);
CREATE INDEX idx_sessions_user_id    ON sessions(user_id);
CREATE INDEX idx_sessions_status     ON sessions(status);
CREATE INDEX idx_power_session_time  ON power_readings(session_id, recorded_at DESC);

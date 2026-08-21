-- billing-service database schema
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS invoices (
  id             VARCHAR(10)  PRIMARY KEY,
  session_id     VARCHAR(10)  NOT NULL,
  user_id        VARCHAR(20)  NOT NULL,
  invoice_date   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  energy_kwh     DECIMAL(10,3),
  tariff_per_kwh INTEGER,
  subtotal       INTEGER,
  tax            INTEGER,
  total_amount   INTEGER,
  payment_status VARCHAR(20)  NOT NULL DEFAULT 'pending',
  payment_method VARCHAR(50),
  paid_at        TIMESTAMPTZ,
  created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Audit trail permanen setiap percobaan pembayaran
CREATE TABLE IF NOT EXISTS transactions (
  id             UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id     VARCHAR(10)  NOT NULL REFERENCES invoices(id),
  payment_method VARCHAR(50)  NOT NULL,
  gateway        VARCHAR(50),
  gateway_ref    VARCHAR(100),
  amount         INTEGER,
  status         VARCHAR(20)  NOT NULL DEFAULT 'success',
  paid_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payment_history (
  id          SERIAL       PRIMARY KEY,
  user_id     VARCHAR(20)  NOT NULL,
  invoice_id  VARCHAR(10)  REFERENCES invoices(id),
  action      VARCHAR(50)  NOT NULL,
  metadata    JSONB,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$ LANGUAGE plpgsql;

CREATE TRIGGER invoices_updated_at BEFORE UPDATE ON invoices FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX idx_invoices_user_id     ON invoices(user_id);
CREATE INDEX idx_invoices_session_id  ON invoices(session_id);
CREATE INDEX idx_invoices_status      ON invoices(payment_status);
CREATE INDEX idx_payment_history_user ON payment_history(user_id, created_at DESC);

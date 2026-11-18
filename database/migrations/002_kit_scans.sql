BEGIN;

CREATE TABLE kit_scans (
  id SERIAL PRIMARY KEY,
  kit_unit_id INTEGER NOT NULL REFERENCES item_units(id) ON DELETE RESTRICT,
  user_id TEXT NOT NULL,
  reservation_id INTEGER UNIQUE REFERENCES reservations(id) ON DELETE RESTRICT,
  empty_count INTEGER NOT NULL CHECK (empty_count >= 0),
  sensor_count INTEGER NOT NULL CHECK (sensor_count >= 0),
  two_sensor_count INTEGER NOT NULL CHECK (two_sensor_count >= 0),
  expected_slots INTEGER NOT NULL CHECK (expected_slots > 0),
  status TEXT NOT NULL CHECK (status IN ('success', 'missing')),
  confidence NUMERIC(5, 4) NOT NULL CHECK (confidence BETWEEN 0 AND 1),
  confidence_threshold NUMERIC(5, 4) NOT NULL CHECK (confidence_threshold BETWEEN 0 AND 1),
  model_version TEXT NOT NULL,
  captured_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  confirmed_at TIMESTAMPTZ,
  CHECK (empty_count + sensor_count + two_sensor_count = expected_slots),
  CHECK ((reservation_id IS NULL) = (confirmed_at IS NULL))
);

CREATE INDEX kit_scans_pending_idx
  ON kit_scans (kit_unit_id, user_id, expires_at)
  WHERE reservation_id IS NULL;

COMMIT;

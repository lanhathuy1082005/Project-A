BEGIN;

CREATE TABLE single_item_scans (
  id SERIAL PRIMARY KEY,
  item_unit_id INTEGER NOT NULL REFERENCES item_units(id) ON DELETE RESTRICT,
  user_id TEXT NOT NULL,
  reservation_id INTEGER UNIQUE REFERENCES reservations(id) ON DELETE RESTRICT,
  detected_item_class TEXT NOT NULL CHECK (
    detected_item_class IN (
      'Arduino-Nano-33-BLE-Rev2',
      'Arduino-Nano-Every',
      'Arduino-Nano-Motor-Carrier',
      'Arduino-Nano-R4-Headers',
      'Arduino-UNO-R3',
      'Arduino-UNO-R4-WiFi'
    )
  ),
  item_confidence NUMERIC(5, 4) NOT NULL CHECK (item_confidence BETWEEN 0 AND 1),
  qr_confidence NUMERIC(5, 4) NOT NULL CHECK (qr_confidence BETWEEN 0 AND 1),
  confidence_threshold NUMERIC(5, 4) NOT NULL CHECK (confidence_threshold BETWEEN 0 AND 1),
  model_version TEXT NOT NULL,
  captured_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  confirmed_at TIMESTAMPTZ,
  CHECK ((reservation_id IS NULL) = (confirmed_at IS NULL))
);

CREATE INDEX single_item_scans_pending_idx
  ON single_item_scans (item_unit_id, user_id, expires_at)
  WHERE reservation_id IS NULL;

COMMIT;

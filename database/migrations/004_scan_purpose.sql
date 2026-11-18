-- A scan row now records why it was taken. A reservation can own one
-- checkout scan and one return scan of each kind.
ALTER TABLE kit_scans
  ADD COLUMN purpose TEXT NOT NULL DEFAULT 'checkout'
  CONSTRAINT kit_scans_purpose_check CHECK (purpose IN ('checkout', 'return'));
ALTER TABLE kit_scans DROP CONSTRAINT kit_scans_reservation_id_key;
ALTER TABLE kit_scans
  ADD CONSTRAINT kit_scans_reservation_purpose_key UNIQUE (reservation_id, purpose);

ALTER TABLE single_item_scans
  ADD COLUMN purpose TEXT NOT NULL DEFAULT 'checkout'
  CONSTRAINT single_item_scans_purpose_check CHECK (purpose IN ('checkout', 'return'));
ALTER TABLE single_item_scans DROP CONSTRAINT single_item_scans_reservation_id_key;
ALTER TABLE single_item_scans
  ADD CONSTRAINT single_item_scans_reservation_purpose_key UNIQUE (reservation_id, purpose);

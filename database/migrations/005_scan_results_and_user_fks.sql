-- Failed scans may now be stored, but only as return scans, so a flagged return
-- keeps its evidence. Checkout scans still have to pass, and a checkout kit scan
-- may never be completely empty (DB backstop for the Node rule).

-- kit_scans ------------------------------------------------------------------
ALTER TABLE kit_scans DROP CONSTRAINT kit_scans_status_check;
ALTER TABLE kit_scans ADD CONSTRAINT kit_scans_status_check
  CHECK (status IN ('success', 'missing', 'wrong', 'unsure'));

-- 'wrong' means the counts do not add up, so the sum rule only binds counted results.
ALTER TABLE kit_scans DROP CONSTRAINT kit_scans_check;
ALTER TABLE kit_scans ADD CONSTRAINT kit_scans_counts_check
  CHECK (status NOT IN ('success', 'missing')
         OR empty_count + sensor_count + two_sensor_count = expected_slots);

ALTER TABLE kit_scans ADD CONSTRAINT kit_scans_checkout_status_check
  CHECK (purpose = 'return' OR status IN ('success', 'missing'));
ALTER TABLE kit_scans ADD CONSTRAINT kit_scans_checkout_not_empty_check
  CHECK (purpose = 'return' OR empty_count < expected_slots);

-- single_item_scans ----------------------------------------------------------
ALTER TABLE single_item_scans
  ADD COLUMN status TEXT NOT NULL DEFAULT 'success'
  CONSTRAINT single_item_scans_status_check CHECK (status IN ('success', 'wrong', 'unsure'));
ALTER TABLE single_item_scans ALTER COLUMN status DROP DEFAULT;

ALTER TABLE single_item_scans ALTER COLUMN detected_item_class DROP NOT NULL;
ALTER TABLE single_item_scans ALTER COLUMN item_confidence     DROP NOT NULL;
ALTER TABLE single_item_scans ALTER COLUMN qr_confidence       DROP NOT NULL;

ALTER TABLE single_item_scans ADD CONSTRAINT single_item_scans_success_complete_check
  CHECK (status <> 'success'
         OR (detected_item_class IS NOT NULL
             AND item_confidence IS NOT NULL
             AND qr_confidence IS NOT NULL));
ALTER TABLE single_item_scans ADD CONSTRAINT single_item_scans_checkout_status_check
  CHECK (purpose = 'return' OR status = 'success');

-- user_id foreign keys -------------------------------------------------------
DO $$
DECLARE orphans INTEGER;
BEGIN
  SELECT (SELECT COUNT(*) FROM kit_scans s
           WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.id = s.user_id))
       + (SELECT COUNT(*) FROM single_item_scans s
           WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.id = s.user_id))
    INTO orphans;
  IF orphans > 0 THEN
    RAISE EXCEPTION '% scan row(s) reference unknown users; fix them before applying 005', orphans;
  END IF;
END $$;

ALTER TABLE kit_scans ADD CONSTRAINT kit_scans_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT NOT VALID;
ALTER TABLE kit_scans VALIDATE CONSTRAINT kit_scans_user_id_fkey;

ALTER TABLE single_item_scans ADD CONSTRAINT single_item_scans_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT NOT VALID;
ALTER TABLE single_item_scans VALIDATE CONSTRAINT single_item_scans_user_id_fkey;

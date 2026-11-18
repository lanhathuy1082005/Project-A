-- Link single-item scans to the catalog instead of a hardcoded class list.
-- Expand step: detected_item_class stays for now and is dropped in a later migration.
ALTER TABLE single_item_scans
  ADD COLUMN detected_item_id INTEGER REFERENCES items(id) ON DELETE RESTRICT;

UPDATE single_item_scans s
   SET detected_item_id = i.id
  FROM items i
 WHERE i.name = s.detected_item_class
   AND s.detected_item_id IS NULL;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM single_item_scans
              WHERE status = 'success' AND detected_item_id IS NULL) THEN
    RAISE EXCEPTION 'successful scans whose class matches no item name; add the items before applying 006';
  END IF;
END $$;

ALTER TABLE single_item_scans ADD CONSTRAINT single_item_scans_success_item_check
  CHECK (status <> 'success' OR detected_item_id IS NOT NULL);

-- The class list now lives in the model's class map and the items table.
ALTER TABLE single_item_scans DROP CONSTRAINT single_item_scans_detected_item_class_check;

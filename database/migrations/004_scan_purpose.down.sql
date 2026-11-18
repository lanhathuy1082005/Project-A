DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM kit_scans WHERE purpose = 'return')
     OR EXISTS (SELECT 1 FROM single_item_scans WHERE purpose = 'return') THEN
    RAISE EXCEPTION 'return scans exist; delete or archive them before reverting 004';
  END IF;
END $$;

ALTER TABLE kit_scans DROP CONSTRAINT kit_scans_reservation_purpose_key;
ALTER TABLE kit_scans ADD CONSTRAINT kit_scans_reservation_id_key UNIQUE (reservation_id);
ALTER TABLE kit_scans DROP COLUMN purpose;

ALTER TABLE single_item_scans DROP CONSTRAINT single_item_scans_reservation_purpose_key;
ALTER TABLE single_item_scans ADD CONSTRAINT single_item_scans_reservation_id_key UNIQUE (reservation_id);
ALTER TABLE single_item_scans DROP COLUMN purpose;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM kit_scans WHERE status NOT IN ('success', 'missing'))
     OR EXISTS (SELECT 1 FROM single_item_scans WHERE status <> 'success') THEN
    RAISE EXCEPTION 'failed scans exist; delete or archive them before reverting 005';
  END IF;
END $$;

ALTER TABLE single_item_scans DROP CONSTRAINT single_item_scans_user_id_fkey;
ALTER TABLE kit_scans         DROP CONSTRAINT kit_scans_user_id_fkey;

ALTER TABLE single_item_scans DROP CONSTRAINT single_item_scans_checkout_status_check;
ALTER TABLE single_item_scans DROP CONSTRAINT single_item_scans_success_complete_check;
ALTER TABLE single_item_scans ALTER COLUMN qr_confidence       SET NOT NULL;
ALTER TABLE single_item_scans ALTER COLUMN item_confidence     SET NOT NULL;
ALTER TABLE single_item_scans ALTER COLUMN detected_item_class SET NOT NULL;
ALTER TABLE single_item_scans DROP COLUMN status;

ALTER TABLE kit_scans DROP CONSTRAINT kit_scans_checkout_not_empty_check;
ALTER TABLE kit_scans DROP CONSTRAINT kit_scans_checkout_status_check;
ALTER TABLE kit_scans DROP CONSTRAINT kit_scans_counts_check;
ALTER TABLE kit_scans ADD CONSTRAINT kit_scans_check
  CHECK (empty_count + sensor_count + two_sensor_count = expected_slots);
ALTER TABLE kit_scans DROP CONSTRAINT kit_scans_status_check;
ALTER TABLE kit_scans ADD CONSTRAINT kit_scans_status_check
  CHECK (status IN ('success', 'missing'));

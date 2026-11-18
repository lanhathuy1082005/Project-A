DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM item_units
              WHERE status NOT IN ('Available', 'Needs Checking', 'Borrowed', 'Broken')) THEN
    RAISE EXCEPTION 'item_units has unknown status values; fix them before applying 009';
  END IF;
END $$;

ALTER TABLE item_units ADD CONSTRAINT item_units_status_check
  CHECK (status IN ('Available', 'Needs Checking', 'Borrowed', 'Broken'));

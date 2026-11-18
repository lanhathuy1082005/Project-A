-- A return that could not be verified still closes the loan, but carries a
-- reason so the admin checks it in the pending-returns list.
ALTER TABLE reservations ADD COLUMN return_flag TEXT
  CONSTRAINT reservations_return_flag_check
  CHECK (return_flag IN ('unsure', 'wrong', 'count_mismatch', 'scan_unavailable'));
ALTER TABLE reservations ADD CONSTRAINT reservations_return_flag_closed_check
  CHECK (return_flag IS NULL OR actual_return_date IS NOT NULL);

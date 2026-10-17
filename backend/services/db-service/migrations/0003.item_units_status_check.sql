-- depends: 0002.reservations_approval_status

-- `status` was a free-form varchar with no constraint — a typo or case mismatch
-- (e.g. 'borrowed' instead of 'Borrowed') would silently corrupt data since nothing in
-- the DB enforced the allowed set. Confirmed current data only contains 'Available'
-- before applying this, and the 5 values below are exactly what main.py already compares
-- against (get_inventory_stats, return_item), so this doesn't change any accepted value.
ALTER TABLE item_units
  ADD CONSTRAINT item_units_status_check
  CHECK (status IN ('Available', 'Borrowed', 'Maintenance', 'Broken', 'Needs Checking'));

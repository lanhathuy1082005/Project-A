-- depends: 0001.attendance_session_date

-- v_reservations selects `approved`, which this migration drops below — drop the view
-- first and recreate it at the end with the new column list.
DROP VIEW v_reservations;

-- `is_approved` is a dead column: confirmed zero non-null rows, never read or written by
-- any code in this repo. Dropping it before the real fix below so it doesn't linger as a
-- second, unused tri-state next to the new `approval_status`.
ALTER TABLE reservations DROP COLUMN is_approved;

-- `approved` was a nullable boolean doing tri-state duty (NULL = pending, TRUE = approved,
-- FALSE = issue reported). That's non-obvious and doesn't leave room for future states
-- (e.g. "rejected", "lost"). Replace it with an explicit, constrained status column.
ALTER TABLE reservations ADD COLUMN approval_status text;

UPDATE reservations SET approval_status = CASE
  WHEN approved IS NULL THEN 'pending'
  WHEN approved THEN 'approved'
  ELSE 'issue_reported'
END;

-- DEFAULT 'pending' matters here: borrow_item() inserts a reservation row without
-- specifying approval_status (a new borrow always starts pending) — without a default
-- that INSERT would violate the NOT NULL constraint added below.
ALTER TABLE reservations ALTER COLUMN approval_status SET DEFAULT 'pending';
ALTER TABLE reservations ALTER COLUMN approval_status SET NOT NULL;

ALTER TABLE reservations
  ADD CONSTRAINT reservations_approval_status_check
  CHECK (approval_status IN ('pending', 'approved', 'issue_reported'));

ALTER TABLE reservations DROP COLUMN approved;

-- Recreate the view: now exposes approval_status instead of approved, and exposes
-- timetable_id directly (it never did before, which is why main.py had to filter by
-- class via a roundabout subquery back into `reservations` instead of comparing a column
-- on the view itself).
CREATE VIEW v_reservations AS
 SELECT r.id,
    r.borrow_date,
    r.actual_return_date,
    r.approval_status,
    r.timetable_id,
    i.name AS item_name,
    iu.id AS item_unit_id,
    u.id AS user_id,
    c.name AS course_name,
    l.name AS lab_name,
    t.day_of_week,
    t.start_time,
    t.end_time
   FROM reservations r
     JOIN item_units iu ON iu.id = r.item_unit_id
     JOIN items i ON i.id = iu.item_id
     JOIN users u ON u.id::text = r.user_id::text
     JOIN timetable t ON t.id = r.timetable_id
     JOIN courses c ON c.id = t.course_id
     JOIN labs l ON l.id = iu.lab_id;

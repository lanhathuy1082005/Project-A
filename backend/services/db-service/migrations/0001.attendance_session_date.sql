-- depends: 0000.baseline_schema

-- attendance currently only stores (user_id, timetable_id). Since `timetable` is a
-- weekly-recurring slot (day_of_week + start/end time), not a single session, there was
-- no way to tell this week's check-in apart from last week's for the same class.
-- session_date is derived from the existing checked_in_at timestamp (fixed to UTC so the
-- "day" doesn't shift with the server's local timezone setting) so no backfill is needed.
ALTER TABLE attendance
  ADD COLUMN session_date date GENERATED ALWAYS AS ((checked_in_at AT TIME ZONE 'UTC')::date) STORED;

ALTER TABLE attendance
  ADD CONSTRAINT attendance_user_timetable_session_unique UNIQUE (user_id, timetable_id, session_date);

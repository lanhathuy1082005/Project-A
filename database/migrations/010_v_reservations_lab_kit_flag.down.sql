DROP VIEW v_reservations;
CREATE VIEW v_reservations AS
SELECT r.id,
       r.borrow_date,
       r.actual_return_date,
       r.approved,
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
  JOIN items i       ON i.id = iu.item_id
  JOIN users u       ON u.id::text = r.user_id::text
  JOIN timetable t   ON t.id = r.timetable_id
  JOIN courses c     ON c.id = t.course_id
  JOIN labs l        ON l.id = iu.lab_id;

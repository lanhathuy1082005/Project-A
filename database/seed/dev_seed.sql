--
-- Optional dev seed data for Project-A.
--
-- NOT applied automatically. Schema is built entirely by the migrations in
-- backend/services/db-service/migrations/ (Postgres starts empty). This file only
-- restores the sample courses/labs/items/timetable/users that used to live in
-- database/project_a.dump, for local development/demo convenience.
--
-- Usage (after `docker compose up -d postgres db-service` so migrations have run):
--   docker compose exec -T postgres psql -U postgres -d project_a < database/seed/dev_seed.sql
--
-- Captured via `pg_dump --data-only --column-inserts` on 2026-10, excluding `roles`
-- (seeded by migrations/0000.baseline_schema.sql, not here) and yoyo's own tracking
-- tables. Dev-only bcrypt password hashes below — not real credentials.
--

INSERT INTO courses (id, name) VALUES (1, 'cos1');
INSERT INTO courses (id, name) VALUES (2, 'cos2');

INSERT INTO timetable (id, course_id, day_of_week, start_time, end_time) VALUES (1, 1, 1, '09:00:00', '10:30:00');
INSERT INTO timetable (id, course_id, day_of_week, start_time, end_time) VALUES (2, 1, 3, '14:00:00', '15:30:00');
INSERT INTO timetable (id, course_id, day_of_week, start_time, end_time) VALUES (3, 2, 2, '08:00:00', '09:30:00');
INSERT INTO timetable (id, course_id, day_of_week, start_time, end_time) VALUES (4, 2, 4, '13:00:00', '14:30:00');
INSERT INTO timetable (id, course_id, day_of_week, start_time, end_time) VALUES (5, 1, 0, '00:00:00', '23:59:00');
INSERT INTO timetable (id, course_id, day_of_week, start_time, end_time) VALUES (6, 1, 1, '00:00:00', '23:59:00');
INSERT INTO timetable (id, course_id, day_of_week, start_time, end_time) VALUES (7, 1, 2, '00:00:00', '23:59:00');
INSERT INTO timetable (id, course_id, day_of_week, start_time, end_time) VALUES (8, 1, 3, '00:00:00', '23:59:00');
INSERT INTO timetable (id, course_id, day_of_week, start_time, end_time) VALUES (9, 1, 4, '00:00:00', '23:59:00');
INSERT INTO timetable (id, course_id, day_of_week, start_time, end_time) VALUES (10, 1, 5, '00:00:00', '23:59:00');
INSERT INTO timetable (id, course_id, day_of_week, start_time, end_time) VALUES (11, 1, 6, '00:00:00', '23:59:00');
INSERT INTO timetable (id, course_id, day_of_week, start_time, end_time) VALUES (12, 1, 1, '08:18:00', '10:20:00');

INSERT INTO users (id, created_at, password_hash, role_id) VALUES ('user1', '2026-04-08 08:41:47.659174', '$2b$10$dBJOl3fvxt7Di9tNQqC/4e3tMQ/s0wbXPPvdVIHbkMher2v70a.dC', 1);
INSERT INTO users (id, created_at, password_hash, role_id) VALUES ('user2', '2026-04-09 19:45:52.846968', '$2b$10$ZM7oieN5a7O8jOhoDXm0Z.nkgPbBWHQgvkDE7RsB4r8yB5XUEChZW', 1);
INSERT INTO users (id, created_at, password_hash, role_id) VALUES ('admin', '2026-04-10 00:09:39.360783', '$2a$10$yq36HjFxCwW130KtXRKE7.g8QHuEEQvtF6UrwSue4fDdEhcA4YtHe', 2);

INSERT INTO attendance (id, user_id, timetable_id, checked_in_at) VALUES (1, 'user1', 9, '2026-04-09 14:02:33.833424+00');

INSERT INTO items (id, name) VALUES (1, 'device_1');
INSERT INTO items (id, name) VALUES (2, 'device_2');
INSERT INTO items (id, name) VALUES (3, 'device_3');

INSERT INTO course_item (course_id, item_id) VALUES (1, 1);
INSERT INTO course_item (course_id, item_id) VALUES (1, 2);
INSERT INTO course_item (course_id, item_id) VALUES (2, 1);
INSERT INTO course_item (course_id, item_id) VALUES (2, 2);

INSERT INTO labs (id, name) VALUES (1, 'Lab 1');
INSERT INTO labs (id, name) VALUES (2, 'Lab 2');

INSERT INTO item_units (id, item_id, lab_id, status) VALUES (1, 1, 1, 'Available');
INSERT INTO item_units (id, item_id, lab_id, status) VALUES (2, 1, 1, 'Available');
INSERT INTO item_units (id, item_id, lab_id, status) VALUES (3, 1, 1, 'Available');
INSERT INTO item_units (id, item_id, lab_id, status) VALUES (4, 1, 1, 'Available');
INSERT INTO item_units (id, item_id, lab_id, status) VALUES (5, 2, 2, 'Available');
INSERT INTO item_units (id, item_id, lab_id, status) VALUES (6, 2, 2, 'Available');
INSERT INTO item_units (id, item_id, lab_id, status) VALUES (7, 2, 2, 'Available');
INSERT INTO item_units (id, item_id, lab_id, status) VALUES (8, 2, 2, 'Available');

INSERT INTO reservations (id, item_unit_id, user_id, borrow_date, actual_return_date, timetable_id, approval_status) VALUES (1, 1, 'user1', '2026-04-08 16:04:48.944876', '2026-04-08 16:20:05.187751', 8, 'issue_reported');

INSERT INTO timetable_user (timetable_id, user_id) VALUES (5, 'user1');
INSERT INTO timetable_user (timetable_id, user_id) VALUES (6, 'user1');
INSERT INTO timetable_user (timetable_id, user_id) VALUES (7, 'user1');
INSERT INTO timetable_user (timetable_id, user_id) VALUES (8, 'user1');
INSERT INTO timetable_user (timetable_id, user_id) VALUES (9, 'user1');
INSERT INTO timetable_user (timetable_id, user_id) VALUES (10, 'user1');
INSERT INTO timetable_user (timetable_id, user_id) VALUES (11, 'user1');

-- Keep sequences ahead of the explicit ids inserted above so the app's next INSERT
-- (which relies on nextval defaults) doesn't collide with a seeded row.
SELECT pg_catalog.setval('attendance_id_seq', 1, true);
SELECT pg_catalog.setval('courses_id_seq', 2, true);
SELECT pg_catalog.setval('item_units_id_seq', 8, true);
SELECT pg_catalog.setval('items_id_seq', 3, true);
SELECT pg_catalog.setval('labs_id_seq', 2, true);
SELECT pg_catalog.setval('reservations_id_seq', 1, true);
SELECT pg_catalog.setval('timetable_id_seq', 12, true);

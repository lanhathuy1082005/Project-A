-- depends:

-- Baseline schema, captured from `pg_dump --schema-only` on database/project_a.dump
-- (see database/schema-reference/baseline_2026-10.sql for the raw capture). This is the
-- schema as it existed before any of the fixes in the migrations below — kept as-is here
-- (warts included) so the delta migrations that follow apply cleanly on top of it. Lets
-- Postgres start completely empty and be built up by migrations alone, no binary dump
-- required anymore.

CREATE TABLE attendance (
    id integer NOT NULL,
    user_id character varying(255) NOT NULL,
    timetable_id integer NOT NULL,
    checked_in_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE course_item (
    course_id integer,
    item_id integer
);

CREATE TABLE courses (
    id integer NOT NULL,
    name character varying(50) NOT NULL
);

CREATE TABLE feedback (
    id integer NOT NULL,
    user_id character varying(255) NOT NULL,
    content text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);

CREATE TABLE item_units (
    id integer NOT NULL,
    item_id integer,
    lab_id integer,
    status character varying(20) DEFAULT 'Available'::character varying NOT NULL
);

CREATE TABLE items (
    id integer NOT NULL,
    name character varying(50) NOT NULL
);

CREATE TABLE labs (
    id integer NOT NULL,
    name character varying(100)
);

CREATE TABLE reservations (
    id integer NOT NULL,
    item_unit_id integer,
    user_id character varying(255),
    borrow_date timestamp without time zone DEFAULT now() NOT NULL,
    actual_return_date timestamp without time zone,
    timetable_id integer,
    is_approved boolean,
    approved boolean
);

CREATE TABLE roles (
    id integer NOT NULL,
    name character varying(100)
);

CREATE TABLE timetable (
    id integer NOT NULL,
    course_id integer,
    day_of_week integer NOT NULL,
    start_time time without time zone NOT NULL,
    end_time time without time zone NOT NULL,
    CONSTRAINT timetable_day_of_week_check CHECK (((day_of_week >= 0) AND (day_of_week <= 6)))
);

CREATE TABLE timetable_user (
    timetable_id integer NOT NULL,
    user_id character varying(255) NOT NULL
);

CREATE TABLE users (
    id character varying(255) NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    password_hash character varying(255) NOT NULL,
    role_id integer
);

CREATE SEQUENCE attendance_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
ALTER SEQUENCE attendance_id_seq OWNED BY attendance.id;
ALTER TABLE ONLY attendance ALTER COLUMN id SET DEFAULT nextval('attendance_id_seq'::regclass);

CREATE SEQUENCE courses_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
ALTER SEQUENCE courses_id_seq OWNED BY courses.id;
ALTER TABLE ONLY courses ALTER COLUMN id SET DEFAULT nextval('courses_id_seq'::regclass);

CREATE SEQUENCE feedback_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
ALTER SEQUENCE feedback_id_seq OWNED BY feedback.id;
ALTER TABLE ONLY feedback ALTER COLUMN id SET DEFAULT nextval('feedback_id_seq'::regclass);

CREATE SEQUENCE item_units_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
ALTER SEQUENCE item_units_id_seq OWNED BY item_units.id;
ALTER TABLE ONLY item_units ALTER COLUMN id SET DEFAULT nextval('item_units_id_seq'::regclass);

CREATE SEQUENCE items_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
ALTER SEQUENCE items_id_seq OWNED BY items.id;
ALTER TABLE ONLY items ALTER COLUMN id SET DEFAULT nextval('items_id_seq'::regclass);

CREATE SEQUENCE labs_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
ALTER SEQUENCE labs_id_seq OWNED BY labs.id;
ALTER TABLE ONLY labs ALTER COLUMN id SET DEFAULT nextval('labs_id_seq'::regclass);

CREATE SEQUENCE reservations_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
ALTER SEQUENCE reservations_id_seq OWNED BY reservations.id;
ALTER TABLE ONLY reservations ALTER COLUMN id SET DEFAULT nextval('reservations_id_seq'::regclass);

CREATE SEQUENCE roles_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
ALTER SEQUENCE roles_id_seq OWNED BY roles.id;
ALTER TABLE ONLY roles ALTER COLUMN id SET DEFAULT nextval('roles_id_seq'::regclass);

CREATE SEQUENCE timetable_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
ALTER SEQUENCE timetable_id_seq OWNED BY timetable.id;
ALTER TABLE ONLY timetable ALTER COLUMN id SET DEFAULT nextval('timetable_id_seq'::regclass);

CREATE SEQUENCE users_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
ALTER SEQUENCE users_id_seq OWNED BY users.id;
ALTER TABLE ONLY users ALTER COLUMN id SET DEFAULT nextval('users_id_seq'::regclass);

ALTER TABLE ONLY attendance ADD CONSTRAINT attendance_pkey PRIMARY KEY (id);
ALTER TABLE ONLY courses ADD CONSTRAINT courses_name_key UNIQUE (name);
ALTER TABLE ONLY courses ADD CONSTRAINT courses_pkey PRIMARY KEY (id);
ALTER TABLE ONLY feedback ADD CONSTRAINT feedback_pkey PRIMARY KEY (id);
ALTER TABLE ONLY item_units ADD CONSTRAINT item_units_pkey PRIMARY KEY (id);
ALTER TABLE ONLY items ADD CONSTRAINT items_name_key UNIQUE (name);
ALTER TABLE ONLY items ADD CONSTRAINT items_pkey PRIMARY KEY (id);
ALTER TABLE ONLY labs ADD CONSTRAINT labs_pkey PRIMARY KEY (id);
ALTER TABLE ONLY reservations ADD CONSTRAINT reservations_pkey PRIMARY KEY (id);
ALTER TABLE ONLY roles ADD CONSTRAINT roles_pkey PRIMARY KEY (id);
ALTER TABLE ONLY timetable ADD CONSTRAINT timetable_pkey PRIMARY KEY (id);
ALTER TABLE ONLY timetable_user ADD CONSTRAINT timetable_user_pkey PRIMARY KEY (timetable_id, user_id);
ALTER TABLE ONLY users ADD CONSTRAINT users_pkey PRIMARY KEY (id);

CREATE INDEX idx_item_units_item_id ON item_units USING btree (item_id);
CREATE INDEX idx_reservations_item_unit_id ON reservations USING btree (item_unit_id);
CREATE INDEX idx_reservations_timetable_id ON reservations USING btree (timetable_id);
CREATE INDEX idx_reservations_user_id ON reservations USING btree (user_id);
CREATE INDEX idx_timetable_user_user_id ON timetable_user USING btree (user_id);
CREATE UNIQUE INDEX uq_one_active_borrow ON reservations USING btree (item_unit_id) WHERE (actual_return_date IS NULL);

ALTER TABLE ONLY attendance ADD CONSTRAINT attendance_timetable_id_fkey FOREIGN KEY (timetable_id) REFERENCES timetable(id) ON DELETE CASCADE;
ALTER TABLE ONLY attendance ADD CONSTRAINT attendance_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE ONLY course_item ADD CONSTRAINT course_item_course_id_fkey FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE;
ALTER TABLE ONLY course_item ADD CONSTRAINT course_item_item_id_fkey FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE;
ALTER TABLE ONLY feedback ADD CONSTRAINT feedback_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE ONLY item_units ADD CONSTRAINT item_units_item_id_fkey FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE;
ALTER TABLE ONLY item_units ADD CONSTRAINT item_units_lab_id_fkey FOREIGN KEY (lab_id) REFERENCES labs(id);
ALTER TABLE ONLY reservations ADD CONSTRAINT reservations_timetable_id_fkey FOREIGN KEY (timetable_id) REFERENCES timetable(id) ON DELETE RESTRICT;
ALTER TABLE ONLY reservations ADD CONSTRAINT reservations_unit_item_id_fkey FOREIGN KEY (item_unit_id) REFERENCES item_units(id) ON DELETE RESTRICT;
ALTER TABLE ONLY reservations ADD CONSTRAINT reservations_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT;
ALTER TABLE ONLY timetable ADD CONSTRAINT timetable_course_id_fkey FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE;
ALTER TABLE ONLY timetable_user ADD CONSTRAINT timetable_user_timetable_id_fkey FOREIGN KEY (timetable_id) REFERENCES timetable(id) ON DELETE CASCADE;
ALTER TABLE ONLY users ADD CONSTRAINT users_role_id_fkey FOREIGN KEY (role_id) REFERENCES roles(id);

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
     JOIN items i ON i.id = iu.item_id
     JOIN users u ON u.id::text = r.user_id::text
     JOIN timetable t ON t.id = r.timetable_id
     JOIN courses c ON c.id = t.course_id
     JOIN labs l ON l.id = iu.lab_id;

-- Reference data the application logic depends on by name (main.py's create_user looks
-- up role_id via `WHERE name = 'student'`) — not optional dev-seed data, so it lives in
-- the migration itself rather than database/seed/dev_seed.sql. Order matters: 'student'
-- must land on id 1 to match pre-existing data created before role lookup-by-name existed.
INSERT INTO roles (name) VALUES ('student'), ('admin');

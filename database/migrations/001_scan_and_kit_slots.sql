BEGIN;

CREATE TABLE kit_types (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  slot_count INTEGER NOT NULL CHECK (slot_count > 0)
);

ALTER TABLE items
  ADD COLUMN kit_type_id INTEGER REFERENCES kit_types(id);

COMMIT;

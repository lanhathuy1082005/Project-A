-- Token printed on each physical unit's sticker: https://q.me-qr.com/<token>.
-- Case is preserved; tokens are registered by the admin.
ALTER TABLE item_units ADD COLUMN qr_token TEXT;
ALTER TABLE item_units ADD CONSTRAINT item_units_qr_token_key UNIQUE (qr_token);
ALTER TABLE item_units ADD CONSTRAINT item_units_qr_token_format_check
  CHECK (qr_token ~ '^[A-Za-z0-9]{8}$');

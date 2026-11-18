ALTER TABLE single_item_scans ADD CONSTRAINT single_item_scans_detected_item_class_check
  CHECK (detected_item_class IN (
    'Arduino-Nano-33-BLE-Rev2',
    'Arduino-Nano-Every',
    'Arduino-Nano-Motor-Carrier',
    'Arduino-Nano-R4-Headers',
    'Arduino-UNO-R3',
    'Arduino-UNO-R4-WiFi'
  ));
ALTER TABLE single_item_scans DROP CONSTRAINT single_item_scans_success_item_check;
ALTER TABLE single_item_scans DROP COLUMN detected_item_id;

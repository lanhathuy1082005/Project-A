// Pure decision rules for scan results. No I/O, so they are unit-tested directly.

export const KIT_STATUSES = new Set(['success', 'missing', 'wrong', 'unsure']);

// unsure (low confidence) > wrong (total != slots) > missing (any empty) > success
export const classifyKit = ({ empty_count, sensor_count, two_sensor_count },
                            confidence, threshold, expectedSlots) => {
  if (confidence < threshold) return 'unsure';
  if (empty_count + sensor_count + two_sensor_count !== expectedSlots) return 'wrong';
  return empty_count > 0 ? 'missing' : 'success';
};

// Borrowing allows empty slots, but never a completely empty kit.
export const isKitBorrowable = (scan) =>
  (scan.status === 'success' || scan.status === 'missing')
  && scan.empty_count < scan.expected_slots;

// Return rule, per class against the checkout scan: no more empties than at checkout,
// no fewer 2xsensor pieces, and the total must equal the slot count (guaranteed by a
// success/missing status). Without a checkout scan the baseline is a full kit.
export const kitReturnFlag = (scan, checkout) => {
  if (scan.status === 'unsure') return 'unsure';
  if (scan.status === 'wrong') return 'wrong';
  const baseline = checkout ?? { empty_count: 0, two_sensor_count: 0 };
  if (scan.empty_count > baseline.empty_count) return 'count_mismatch';
  if (scan.two_sensor_count < baseline.two_sensor_count) return 'count_mismatch';
  return null;
};

export const QR_CLASS = 'QR-code';

// A single-item frame passes when it shows exactly one QR code and one item, both at
// or above the confidence threshold, and the item class equals the unit's item name.
export const evaluateSingle = (detections, itemName, threshold) => {
  const qr = detections.filter((d) => d.class_name === QR_CLASS);
  const items = detections.filter((d) => d.class_name !== QR_CLASS);
  if (qr.length !== 1 || items.length !== 1) {
    return {
      status: 'unsure',
      detected_item_class: items.length === 1 ? items[0].class_name : null,
      item_confidence: items.length === 1 ? items[0].confidence : null,
      qr_confidence: qr.length === 1 ? qr[0].confidence : null,
    };
  }
  const [item] = items;
  const base = {
    detected_item_class: item.class_name,
    item_confidence: item.confidence,
    qr_confidence: qr[0].confidence,
  };
  if (Math.min(item.confidence, qr[0].confidence) < threshold)
    return { status: 'unsure', ...base };
  return { status: item.class_name === itemName ? 'success' : 'wrong', ...base };
};

export const singleReturnFlag = (scan) =>
  scan.status === 'success' ? null : scan.status; // 'wrong' | 'unsure'

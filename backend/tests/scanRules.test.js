import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classifyKit, isKitBorrowable, kitReturnFlag, evaluateSingle, singleReturnFlag }
  from '../services/scanRules.js';
import { parseQrToken } from '../utils/qrParser.js';

const counts = (empty_count, sensor_count, two_sensor_count) =>
  ({ empty_count, sensor_count, two_sensor_count });

test('classifyKit orders unsure > wrong > missing > success', () => {
  assert.equal(classifyKit(counts(1, 1, 1), 0.5, 0.8, 6), 'unsure');
  assert.equal(classifyKit(counts(0, 4, 1), 0.9, 0.8, 6), 'wrong');
  assert.equal(classifyKit(counts(1, 4, 1), 0.9, 0.8, 6), 'missing');
  assert.equal(classifyKit(counts(0, 5, 1), 0.9, 0.8, 6), 'success');
});

test('isKitBorrowable allows partial empties but not a fully empty kit', () => {
  assert.equal(isKitBorrowable({ status: 'success', empty_count: 0, expected_slots: 6 }), true);
  assert.equal(isKitBorrowable({ status: 'missing', empty_count: 5, expected_slots: 6 }), true);
  assert.equal(isKitBorrowable({ status: 'missing', empty_count: 6, expected_slots: 6 }), false);
  assert.equal(isKitBorrowable({ status: 'wrong', empty_count: 0, expected_slots: 6 }), false);
  assert.equal(isKitBorrowable({ status: 'unsure', empty_count: 0, expected_slots: 6 }), false);
});

test('kitReturnFlag compares per class against the checkout scan', () => {
  const checkout = { empty_count: 2, two_sensor_count: 1 };
  const scan = (status, empty_count, two_sensor_count) => ({ status, empty_count, two_sensor_count });
  assert.equal(kitReturnFlag(scan('missing', 2, 1), checkout), null);           // same as checkout
  assert.equal(kitReturnFlag(scan('missing', 1, 1), checkout), null);           // filled a slot
  assert.equal(kitReturnFlag(scan('missing', 1, 2), checkout), null);           // more 2xsensor
  assert.equal(kitReturnFlag(scan('missing', 3, 1), checkout), 'count_mismatch'); // lost a piece
  assert.equal(kitReturnFlag(scan('missing', 2, 0), checkout), 'count_mismatch'); // 2x swapped for 1x
  assert.equal(kitReturnFlag(scan('unsure', 2, 1), checkout), 'unsure');
  assert.equal(kitReturnFlag(scan('wrong', 2, 1), checkout), 'wrong');
  assert.equal(kitReturnFlag(scan('success', 0, 0), null), null);                // no baseline: full kit
  assert.equal(kitReturnFlag(scan('missing', 1, 0), null), 'count_mismatch');
});

test('evaluateSingle needs one QR and one item, both confident, exact class name', () => {
  const qr = { class_name: 'QR-code', confidence: 0.9 };
  const uno = { class_name: 'Arduino-UNO-R3', confidence: 0.9 };
  assert.equal(evaluateSingle([qr, uno], 'Arduino-UNO-R3', 0.8).status, 'success');
  assert.equal(evaluateSingle([qr, uno], 'Arduino UNO R3', 0.8).status, 'wrong');   // no fuzzy match
  assert.equal(evaluateSingle([qr, uno], 'arduino-uno-r3', 0.8).status, 'wrong');
  assert.equal(evaluateSingle([uno], 'Arduino-UNO-R3', 0.8).status, 'unsure');
  assert.equal(evaluateSingle([qr, qr, uno], 'Arduino-UNO-R3', 0.8).status, 'unsure');
  assert.equal(evaluateSingle([qr, uno, uno], 'Arduino-UNO-R3', 0.8).status, 'unsure');
  const weak = evaluateSingle([qr, { ...uno, confidence: 0.6 }], 'Arduino-UNO-R3', 0.8);
  assert.equal(weak.status, 'unsure');
  assert.equal(weak.detected_item_class, 'Arduino-UNO-R3');
  assert.equal(singleReturnFlag({ status: 'success' }), null);
  assert.equal(singleReturnFlag({ status: 'wrong' }), 'wrong');
});

test('parseQrToken accepts only q.me-qr.com links with one 8-character token', () => {
  assert.equal(parseQrToken('https://q.me-qr.com/9ljwb7qc'), '9ljwb7qc');
  assert.equal(parseQrToken('  https://Q.ME-QR.com/AbCd1234/  '), 'AbCd1234');  // case kept
  assert.equal(parseQrToken('https://q.me-qr.com/9ljwb7qc?utm=x'), '9ljwb7qc');
  assert.equal(parseQrToken('https://evil.com/9ljwb7qc'), null);
  assert.equal(parseQrToken('https://q.me-qr.com.evil.com/9ljwb7qc'), null);
  assert.equal(parseQrToken('https://q.me-qr.com/a/9ljwb7qc'), null);
  assert.equal(parseQrToken('https://q.me-qr.com/9ljwb7q'), null);
  assert.equal(parseQrToken('https://q.me-qr.com/9ljwb7q-'), null);
  assert.equal(parseQrToken('i:42'), null);
  assert.equal(parseQrToken('9ljwb7qc'), null);
  assert.equal(parseQrToken(null), null);
});

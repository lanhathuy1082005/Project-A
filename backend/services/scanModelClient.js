// HTTP client for the Python scan server. Validates everything it returns.
import { AppError } from '../utils/AppError.js';
import { scanLog } from '../utils/scanLog.js';
import { KIT_STATUSES, classifyKit } from './scanRules.js';

const MAX_IMAGE_BYTES = 7 * 1024 * 1024;
const DEFAULT_SCAN_MODEL_URL = 'http://127.0.0.1:8000';
// Live preview frames must fail fast; only the official (persisted) scan waits longer.
const PREVIEW_TIMEOUT_MS = Number(process.env.SCAN_PREVIEW_TIMEOUT_MS) || 3000;
const OFFICIAL_TIMEOUT_MS = Number(process.env.SCAN_OFFICIAL_TIMEOUT_MS) || 15000;

const modelUrl = () => (
  process.env.SCAN_MODEL_URL || process.env.FACE_API_URL || DEFAULT_SCAN_MODEL_URL
).replace(/\/+$/, '');

export const decodeJpeg = (imageB64) => {
  if (typeof imageB64 !== 'string' || imageB64.length === 0)
    throw new AppError('A scan image is required', 400);
  const image = Buffer.from(imageB64, 'base64');
  if (image.toString('base64') !== imageB64)
    throw new AppError('Scan image must contain valid base64', 400);
  if (!image.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff])))
    throw new AppError('Scan image must be a JPEG image', 400);
  if (image.length > MAX_IMAGE_BYTES)
    throw new AppError('Scan image exceeds the maximum size', 413);
  return image;
};

const post = async (path, body, { official, label }) => {
  const url = `${modelUrl()}${path}`;
  const imageKb = Math.round((body.image_b64.length * 3) / 4 / 1024);
  const timeoutMs = official ? OFFICIAL_TIMEOUT_MS : PREVIEW_TIMEOUT_MS;
  const started = Date.now();
  let response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (error) {
    const timedOut = error?.name === 'TimeoutError';
    scanLog('model.fail', {
      url, official, image_kb: imageKb, ms: Date.now() - started,
      reason: timedOut ? `timeout after ${timeoutMs} ms` : (error?.cause?.code ?? error?.message),
    });
    throw new AppError(timedOut ? `${label} timed out` : `${label} is unavailable`, 503);
  }
  let result;
  try { result = await response.json(); }
  catch {
    scanLog('model.fail', { url, http: response.status, ms: Date.now() - started, reason: 'non-JSON response' });
    throw new AppError(`${label} returned an invalid response`, 502);
  }
  if (!response.ok) {
    // FastAPI puts validation errors (bad image, etc.) in "detail".
    scanLog('model.fail', { url, http: response.status, ms: Date.now() - started, detail: result?.detail });
    throw new AppError(`${label} rejected the image`, 502);
  }
  scanLog('model.ok', { url, official, image_kb: imageKb, ms: Date.now() - started });
  return result;
};

const isUnit = (n) => Number.isFinite(n) && n >= 0 && n <= 1;
const isCount = (n) => Number.isSafeInteger(n) && n >= 0;

export const callKitModel = async (expectedSlots, imageB64, { official = false } = {}) => {
  decodeJpeg(imageB64);
  const label = 'Kit scan model';
  const result = await post(
    '/scan-frames/kit',
    { image_b64: imageB64, expected_slots: expectedSlots },
    { official, label },
  );
  if (
    !result
    || !KIT_STATUSES.has(result.status)
    || result.expected_slots !== expectedSlots
    || !isCount(result.empty_count)
    || !isCount(result.sensor_count)
    || !isCount(result.two_sensor_count)
    || !isUnit(result.confidence)
    || !isUnit(result.confidence_threshold)
    || typeof result.model_version !== 'string'
  ) {
    throw new AppError(`${label} returned invalid results`, 502);
  }
  const expected = classifyKit(
    result, result.confidence, result.confidence_threshold, expectedSlots,
  );
  if (result.status !== expected)
    throw new AppError(`${label} returned inconsistent results`, 502);
  return {
    expected_slots: expectedSlots,
    empty_count: result.empty_count,
    sensor_count: result.sensor_count,
    two_sensor_count: result.two_sensor_count,
    status: result.status,
    confidence: result.confidence,
    confidence_threshold: result.confidence_threshold,
    model_version: result.model_version,
  };
};

export const callSingleModel = async (imageB64, { official = false } = {}) => {
  decodeJpeg(imageB64);
  const label = 'Single-item scan model';
  const result = await post('/scan-frames/single', { image_b64: imageB64 }, { official, label });
  if (
    !result
    || !Array.isArray(result.detections)
    || !isUnit(result.detection_threshold)
    || typeof result.model_version !== 'string'
  ) {
    throw new AppError(`${label} returned invalid results`, 502);
  }
  const detections = result.detections.map((d) => {
    if (
      !d
      || typeof d.class_name !== 'string'
      || d.class_name.length === 0
      || !isUnit(d.confidence)
      || d.confidence < result.detection_threshold
      || !Array.isArray(d.box)
      || d.box.length !== 4
      || !d.box.every(Number.isFinite)
      || d.box[2] <= d.box[0]
      || d.box[3] <= d.box[1]
    ) {
      throw new AppError(`${label} returned an invalid detection`, 502);
    }
    return { class_name: d.class_name, confidence: d.confidence, box: d.box };
  });
  return { detections, model_version: result.model_version };
};

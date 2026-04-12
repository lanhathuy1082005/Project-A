import bcrypt from 'bcrypt';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { getUserByUserId, createUser, createAttendanceRecord, getValidTimetableForUser } from '../models/User.js';
import { AppError } from '../utils/AppError.js';
import { api } from '../utils/apiWrapper.js';

const __dirname_curr = path.dirname(fileURLToPath(import.meta.url));
const FACES_DIR = path.join(__dirname_curr, 'face', 'reference_faces');

const SALT_ROUNDS = 10;

const mockGetUserTruthByUserId = async (id) => {
  const users_truth = [
    { id: 'user1' },
    { id: 'user2' },
    { id: 'user3' }
  ];
  return users_truth.find((u) => u.id === id);
};

const facePath = (id) => path.join(FACES_DIR, `${id}.jpg`);

export const loginUserService = async (id, password) => {
  let user = await getUserByUserId(id);

  if (!user) {
    const truth = await mockGetUserTruthByUserId(id);
    if (!truth) throw new AppError('Student does not exist or wrong password', 401);
    const hash = await bcrypt.hash(password, SALT_ROUNDS);
    user = await createUser(truth.id, hash);
  } else {
    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) throw new AppError('Student does not exist or wrong password', 401);
  }

  return { id: user.id, role: user.role };
};

// ── In-memory token store ────────────────────────────────────────────────────
const faceImages = new Map();

const saveImage = async (dataUrl) => {
  const base64Data = dataUrl.split(',')[1];
  const buffer = Buffer.from(base64Data, 'base64');
  const filename = `${crypto.randomUUID()}.jpg`;
  const filepath = path.join(FACES_DIR, filename);
  await fs.promises.writeFile(filepath, buffer);
  return filepath;
};

// Remove expired temp files; always clean up map entry even if file is already gone
const cleanup = async () => {
  const now = Date.now();
  for (const [key, entry] of faceImages) {
    if (entry.expiresAt < now) {
      try {
        await fs.promises.unlink(entry.imagePath);
        console.log(`[Cleanup] Removed expired temp face: ${entry.imagePath}`);
      } catch {
        // File may already be renamed/deleted — still remove from map
      }
      faceImages.delete(key);
    }
  }
};

// ── Pre-scan student ID check ────────────────────────────────────────────────
// Validates the student ID exists (DB or truth list), then checks face file state.
// Returns the resolved student id so the controller can echo it back to the UI.
export const checkStudentForFaceScan = async (id, mode) => {
  // Validate the student exists in our system
  const dbUser = await getUserByUserId(id);

  if (!dbUser) {
    throw new AppError('Student ID not found', 404);
  }

  const resolvedId = dbUser?.id ?? truth.id;
  const faceExists = fs.existsSync(facePath(resolvedId));

  if (mode === 'face-registration' && faceExists) {
    throw new AppError('Face already registered for this account', 409);
  }
  if (mode === 'attendance-check' && !faceExists) {
    throw new AppError(
      'No face registered for this account yet. Please register at the kiosk first.',
      404
    );
  }

  return { id: resolvedId };
};

// ── Capture: save temp image, return token ───────────────────────────────────
export const captureFace = async (dataUrl) => {
  await cleanup();
  console.log('[CaptureFace] Saving image...');
  const imagePath = await saveImage(dataUrl);
  const token = crypto.randomUUID();
  faceImages.set(token, { imagePath, expiresAt: Date.now() + 2 * 60 * 1000 });
  console.log(`[CaptureFace] Token: ${token}, path: ${imagePath}`);
  return token;
};

// ── Registration: rename temp image to {id}.jpg ──────────────────────────────
export const consumeTokenForFaceRegistration = async (id, token) => {
  await cleanup();

  const entry = faceImages.get(token);
  if (!entry) throw new AppError('Invalid or expired face token', 400);

  const dest = facePath(id);

  // Remove any existing face file so rename succeeds on all platforms
  try { await fs.promises.unlink(dest); } catch { /* didn't exist, fine */ }

  console.log(`[FaceRegistration] Saving face for user=${id}`);
  await fs.promises.rename(entry.imagePath, dest);
  faceImages.delete(token);
  console.log(`[FaceRegistration] Done`);
};

// ── Attendance check: verify face then record attendance ─────────────────────
export const consumeTokenForAttendanceCheck = async (id, token) => {
  console.log(`[AttendanceCheck] Starting for user=${id}`);
  await cleanup();

  const entry = faceImages.get(token);
  if (!entry) throw new AppError('Invalid or expired face token', 400);

  let imageB64;
  try {
    const buf = await fs.promises.readFile(entry.imagePath);
    imageB64 = buf.toString('base64');
  } catch {
    throw new AppError('Failed to read captured face image', 500);
  }

  // Clean up temp file immediately after reading into memory
  try { await fs.promises.unlink(entry.imagePath); } catch { /* already gone */ }
  faceImages.delete(token);

  let faceResult;
  try {
    faceResult = await api.post('/face/verify', { user_id: id, image_b64: imageB64 });
  } catch {
    throw new AppError('Face verification service unavailable', 500);
  }

  if (!faceResult.verified) {
    throw new AppError(`Face does not match — please try again. (distance: ${faceResult.distance})`, 401);
  }

  const timetable = await getValidTimetableForUser(id);
  if (!timetable) throw new AppError('No active class found for current time', 400);

  const record = await createAttendanceRecord(id, timetable.id);
  console.log(`[AttendanceCheck] Record created:`, record);
  return record;
};

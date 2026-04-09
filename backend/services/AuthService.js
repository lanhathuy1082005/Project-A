import bcrypt from 'bcrypt';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { getUserByUserId, createUser, createAttendanceRecord, getValidTimetableForUser } from '../models/User.js';
import { AppError } from '../utils/AppError.js';
import { api } from '../utils/apiWrapper.js';

const SALT_ROUNDS = 10;

const mockGetUserTruthByUserId = async (id) => {
  const users_truth = [
    { id: 'user1' },
    { id: 'user2' },
    { id: 'user3'}
  ];

  return users_truth.find((u) => u.id === id);
};

export const loginUserService = async (id, password) => {
  let user = await getUserByUserId(id);

  if (!user) {
    const truth = await mockGetUserTruthByUserId(id);
    if (!truth) throw new AppError('student does not exist or wrong password', 401);
    const hash    = await bcrypt.hash(password, SALT_ROUNDS);
    let user          = await createUser(truth.id, hash);  
    return { id: user.id, role: user.role };
  }

  const isValid = await bcrypt.compare(password, user.password_hash);
  if (!isValid) throw new AppError('student does not exist or wrong password', 401);

  return { id: user.id, role: user.role };
};

const faceImages = new Map();

const saveImage = async (dataUrl) => {
  const Base64Data = dataUrl.split(',')[1];
  const buffer = Buffer.from(Base64Data, 'base64');
  const filename = `${crypto.randomUUID()}.jpg`;
  const filepath = path.join('services','face','reference_faces', filename);
  await fs.promises.writeFile(filepath, buffer);
  return filepath;
}

export const captureFace = async (dataUrl) => {
  console.log(`[CaptureFace] Saving image...`)
  const imagePath = await saveImage(dataUrl)
  const token = crypto.randomUUID()
  faceImages.set(token, { imagePath: imagePath, expiresAt: Date.now() + 2 * 60 * 1000 })
  console.log(`[CaptureFace] Token created: ${token}, imagePath: ${imagePath}`)
  return token
}

// lazy cleanup
const cleanup = async () => {
  const now = Date.now()
  for (const [key, entry] of faceImages) {
    if (entry.expiresAt < now) {
      try {
        console.log(`Cleaning up expired face image at ${entry.imagePath}`)
        await fs.promises.unlink(entry.imagePath)
      } catch (e) {
        console.error(`Failed to delete expired face image at ${entry.imagePath}:`, e)
        continue
      } 
      faceImages.delete(key)
    }
  }
}

export const consumeTokenForFaceRegistration = async (id, token) => {
  console.log(`[FaceRegistration] Starting for user=${id}, token=${token}`)

  await cleanup() 

  const entry = faceImages.get(token)
  if (!entry) {
    console.log(`[FaceRegistration] Token not found in faceImages map`)
    throw new AppError('Invalid face token', 400)
  }

  const destPath = path.join('services','face','reference_faces', `${id}.jpg`)
  console.log(`[FaceRegistration] Renaming ${entry.imagePath} -> ${destPath}`)
  await fs.promises.rename(entry.imagePath, destPath)
  faceImages.delete(token)
  console.log(`[FaceRegistration] Done`)
}

export const consumeTokenForAttendanceCheck = async (id, token) => {
  console.log(`[AttendanceCheck] Starting for user=${id}, token=${token}`)

  await cleanup()

  const entry = faceImages.get(token)
  if (!entry) {
    console.log(`[AttendanceCheck] Token not found in faceImages map`)
    throw new AppError('Invalid face token', 400)
  }
  console.log(`[AttendanceCheck] Token found, imagePath=${entry.imagePath}`)

  // Read the image file and convert to base64 for the face service
  let imageB64
  try {
    const imageBuffer = await fs.promises.readFile(entry.imagePath)
    imageB64 = imageBuffer.toString('base64')
    console.log(`[AttendanceCheck] Image read successfully, base64 length=${imageB64.length}`)
  } catch (e) {
    console.error(`[AttendanceCheck] Failed to read image file:`, e)
    throw new AppError('Failed to read face image', 500)
  }

  let faceResult // verified: boolean, distance: number, threshold: number

  try {
    console.log(`[AttendanceCheck] Calling face service /face/verify for user=${id}`)
    faceResult = await api.post('/face/verify', { user_id: id, image_b64: imageB64 })
    console.log(`[AttendanceCheck] Face service response:`, faceResult)
  } catch (e) {
    console.error(`[AttendanceCheck] Face service call failed:`, e)
    throw new AppError('Face verification failed', 500)
  }

  if (!faceResult.verified) {
    console.log(`[AttendanceCheck] Face not verified: distance=${faceResult.distance}, threshold=${faceResult.threshold}`)
    throw new AppError('Face verification failed', 401)
  }

  console.log(`[AttendanceCheck] Face verified! Looking up timetable for user=${id}`)
  const timetable = await getValidTimetableForUser(id)
  if (!timetable) {
    console.log(`[AttendanceCheck] No valid timetable found for user=${id} at current time`)
    throw new AppError('No active class found for current time', 400)
  }
  const timetableId = timetable.id
  console.log(`[AttendanceCheck] Found timetableId=${timetableId}, creating attendance record`)

  const record = await createAttendanceRecord(id, timetableId)
  console.log(`[AttendanceCheck] Attendance record created:`, record)

  faceImages.delete(token)

  return record
}
import bcrypt from 'bcrypt';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { getUserByUserId, createUser, updateFacePath } from '../models/User.js';
import { AppError } from '../utils/AppError.js';

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

const saveImage = (dataUrl) => {
  const Base64Data = dataUrl.replace(/^data:image\/\w+;base64,/, '');
  const buffer = Buffer.from(Base64Data, 'base64');
  const filename = `${crypto.randomUUID()}.jpg`;
  const filepath = path.join('face','reference_faces', filename);
  fs.writeFileSync(filepath, buffer);
  return filepath;
}

export const captureFace = async (dataUrl) => {
  const imagePath = saveImage(dataUrl) // TODO: Implement saveImageToDisk to save the image and return its path
  const token = crypto.randomUUID()
  faceImages.set(token, { imagePath: imagePath, expiresAt: Date.now() + 2 * 60 * 1000 }) // Token valid for 2 minutes
  return token
}

export const consumeToken = async (id, token) => {
// lazy cleanup
  const now = Date.now()
  for (const [key, entry] of pendingFaces) {
    if (entry.expiresAt < now) pendingFaces.delete(key)
  }

  const entry = faceImages.get(token)
  if (!entry || entry.expiresAt < Date.now()) return null
  faceImages.delete(token)
  await updateFacePath(id, entry.imagePath);
}
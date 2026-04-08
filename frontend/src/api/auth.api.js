import { client } from './client.js'

export const loginApi       = (credentials)  => client.post('/api/auth/login',  credentials)
export const logoutApi      = ()             => client.post('/api/auth/logout')
export const fetchCurrentUser = ()           => client.get('/api/auth/me')
export const faceCaptureApi = (imageDataUrl) => client.post('/api/face/capture', { image: imageDataUrl })
export const faceLinkApi = (faceToken) => client.post('/api/face/link', { face_token: faceToken })
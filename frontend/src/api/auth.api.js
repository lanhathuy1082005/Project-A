import { client } from './client.js'

export const loginApi       = (credentials)  => client.post('/api/auth/login',  credentials)
export const logoutApi      = ()             => client.post('/api/auth/logout')
export const fetchCurrentUser = ()           => client.get('/api/auth/me')
export const faceCaptureApi = (dataUrl) => client.post('/api/auth/face/capture', { dataUrl: dataUrl })
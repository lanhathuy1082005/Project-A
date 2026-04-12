import { client } from './client.js'

export const loginApi           = (credentials)                  => client.post('/api/auth/login',               credentials)
export const logoutApi          = ()                             => client.post('/api/auth/logout')
export const fetchCurrentUser   = ()                             => client.get('/api/auth/me')
export const faceCaptureApi     = (dataUrl)                      => client.post('/api/auth/face/capture',         { dataUrl })
export const checkStudentIdApi  = (id, mode)                     => client.post('/api/auth/face/check-student',   { id, mode })
export const faceVerifyApi      = (user_id, faceToken, mode)     => client.post('/api/auth/face/verify',          { user_id, faceToken, mode })

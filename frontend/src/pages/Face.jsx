import * as faceapi from 'face-api.js'
import { useRef, useEffect, useState } from 'react'
import QRCode from 'react-qr-code'
import { faceCaptureApi } from '../api/auth.api.js'

export default function Face() {
  const videoRef = useRef(null)
  const streamRef = useRef(null)

  const [modelsLoaded, setModelsLoaded] = useState(false)
  const [cameraReady,  setCameraReady]  = useState(false)
  const [showCamera,   setShowCamera]   = useState(true)
  const [token,        setToken]        = useState(null)
  const [error,        setError]        = useState(null)

  // ── Load model ────────────────────────────────────────────────────────────
  useEffect(() => {
    faceapi.nets.tinyFaceDetector.loadFromUri('/models')
      .then(() => setModelsLoaded(true))
      .catch(err => console.error('Model load failed:', err))
  }, [])

  // ── Start camera ─────────────────────────────────────────────────────────
  const startCamera = () => {
    navigator.mediaDevices.getUserMedia({ video: true })
      .then(stream => {
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
        }
      })
      .catch(err => console.error('Camera error:', err))
  }

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
    }
  }

  useEffect(() => {
    startCamera()
    return stopCamera
  }, [])

  // ── Detection loop ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!modelsLoaded || !cameraReady) return

    const timeout = setTimeout(() => {
      const interval = setInterval(async () => {
        const video = videoRef.current
        if (!video || video.readyState !== 4) return

        const canvas = document.createElement('canvas')
        canvas.width  = video.videoWidth
        canvas.height = video.videoHeight
        canvas.getContext('2d').drawImage(video, 0, 0)
        const dataUrl = canvas.toDataURL('image/jpeg')

        const img = new Image()
        img.src = dataUrl
        img.onload = async () => {
          const detection = await faceapi.detectSingleFace(
            img,
            new faceapi.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.3 })
          )

          if (detection) {
            clearInterval(interval)
            stopCamera()
            setShowCamera(false)

            // Send image to backend, get token
            try {
              const res = await faceCaptureApi(dataUrl)
              setError(null)
              setToken(res.data.token)
            } catch (err) {
              setError(err.message)
            }
          }
        }
      }, 500)

      return () => clearInterval(interval)
    }, 2000)

    return () => clearTimeout(timeout)
  }, [modelsLoaded, cameraReady])

  // ── Reset: show camera again after QR expires or is used ──────────────────
  const reset = () => {
    setToken(null)
    setError(null)
    setShowCamera(true)
    setCameraReady(false)
    startCamera()
  }


  // ── QR value ──────────────────────────────────────────────────────────────
  const qrUrl = token
    ? `${window.location.origin}/login?face_token=${token}`
    : null

  return (
    <div style={{ padding: '24px', maxWidth: '500px', margin: '0 auto' }}>
      <h2 style={{ fontWeight: 500, marginBottom: '20px' }}>Đăng ký khuôn mặt</h2>

      {showCamera && (
        <>
          <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', marginBottom: '12px' }}>
            Look at the camera...
          </p>
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            onCanPlay={() => setCameraReady(true)}
            style={{ width: '100%', borderRadius: '8px', background: '#000' }}
          />
        </>
      )}

      {qrUrl && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
          <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)' }}>
            Scan this QR code with your phone to link your face to your account. It will expire in 5 minutes.
          </p>
          <div style={{ padding: '16px', background: '#fff', borderRadius: '8px' }}>
            <QRCode value={qrUrl} size={200} />
          </div>
          <button onClick={reset}>Quét lại</button>
        </div>
      )}

      {error && (
        <div style={{ marginTop: '12px' }}>
          <p style={{
            fontSize: '13px', padding: '8px 12px', borderRadius: '6px',
            background: 'var(--color-background-danger)', color: 'var(--color-text-danger)',
          }}>
            {error}
          </p>
          <button onClick={reset} style={{ marginTop: '8px' }}>Try again</button>
        </div>
      )}
    </div>
  )
}
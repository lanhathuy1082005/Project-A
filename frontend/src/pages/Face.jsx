import * as faceapi from 'face-api.js'
import { useRef, useEffect, useState } from 'react'
import QRCode from 'react-qr-code'
import { faceCaptureApi } from '../api/auth.api.js'

export default function Face() {
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const isRunningRef = useRef(true)
  const [mode,         setMode]         = useState(null) // 'attendance-check' or 'face-registration'
  const [modelsLoaded, setModelsLoaded] = useState(false)
  const [cameraReady,  setCameraReady]  = useState(false)
  const [showCamera,   setShowCamera]   = useState(true)
  const [token,        setToken]        = useState(null)
  const [error,        setError]        = useState(null)
  const [hoveredBack,       setHoveredBack]       = useState(false)
  const [hoveredRescan,     setHoveredRescan]     = useState(false)
  const [hoveredTryAgain,   setHoveredTryAgain]   = useState(false)
  const [hoveredRegister,   setHoveredRegister]   = useState(false)
  const [hoveredAttendance, setHoveredAttendance] = useState(false)

  // ── Load model ────────────────────────────────────────────────────────────
  useEffect(() => {
    faceapi.nets.tinyFaceDetector.loadFromUri('/models')
      .then(() => {
        setModelsLoaded(true)
      })
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

    if (videoRef.current) {
      videoRef.current.srcObject = null // Stop video stream
    }
  }

  useEffect(() => {
    if (!mode){
      stopCamera()
      return
    }
    startCamera()
    return stopCamera
  }, [mode])

  const switchMode = (newMode) => {
    stopCamera()
    setCameraReady(false)
    setShowCamera(true)
    setToken(null)
    setError(null)
    isRunningRef.current = false
    setMode(newMode)
  }

  const goBack = () => {
    stopCamera()
    setCameraReady(false)
    setShowCamera(true)
    setToken(null)
    setError(null)
    isRunningRef.current = false
    setMode(null)
  }

  // ── Detection loop ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!modelsLoaded || !cameraReady || !mode) return

    isRunningRef.current = true
    let interval

    interval = setInterval(async () => {
      if (!isRunningRef.current) {
        return
      }

      const video = videoRef.current
      if (!video || video.readyState !== 4) {
        return
      }


      try {
        const canvas = document.createElement('canvas')
        canvas.width  = video.videoWidth
        canvas.height = video.videoHeight
        canvas.getContext('2d').drawImage(video, 0, 0)
        const dataUrl = canvas.toDataURL('image/jpeg')

        const img = new Image()
        img.src = dataUrl

        // Use Promise wrapper to handle async image loading
        await new Promise((resolve) => {
          img.onload = async () => {
            if (!isRunningRef.current) {
              resolve()
              return
            }

            const detection = await faceapi.detectSingleFace(
              img,
              new faceapi.TinyFaceDetectorOptions(
                { inputSize: 416, scoreThreshold: 0.3 }
              )
            )

            if (!isRunningRef.current) {
              resolve()
              return
            }

            if (detection) {
              isRunningRef.current = false

              if (interval) clearInterval(interval)
              stopCamera()
              setShowCamera(false)
              try {
              const res = await faceCaptureApi(dataUrl)
              setToken(res.token)
              } catch (err) {
              setError(err.message)
              }
            }
            resolve()
          }
          img.onerror = () => {
            console.error('Image load error')
            resolve()
          }
        })
      } catch (err) {
        console.error('Detection error:', err)
      }
    }, 500)

    return () => {
      isRunningRef.current = false
      if (interval) {
        clearInterval(interval)
      }
    }
  }, [mode, modelsLoaded, cameraReady])

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
    ? `${window.location.origin}/login?face_token=${token}&mode=${mode}`
    : null

  return (
    <div style={{
      display:         'flex',
      flexDirection:   'column',
      justifyContent:  'center',
      alignItems:      'center',
      minHeight:       '100vh',
      backgroundColor: '#fff',
      padding:         '24px',
    }}>
      <div style={{
        backgroundColor: '#111',
        borderRadius:    '24px',
        padding:         '40px 36px',
        width:           '100%',
        maxWidth:        '460px',
        display:         'flex',
        flexDirection:   'column',
        gap:             '20px',
        color:           '#fff',
      }}>
        <h2 style={{ margin: 0, fontWeight: 800, fontSize: '1.6rem' }}>
          {mode === 'face-registration' ? 'Face Registration' : 'Attendance Check-in'}
        </h2>

        {mode ? (
          <>
            <button
              onClick={goBack}
              onMouseEnter={() => setHoveredBack(true)}
              onMouseLeave={() => setHoveredBack(false)}
              style={{
                alignSelf:       'flex-start',
                background:      hoveredBack ? 'rgba(255,255,255,0.12)' : 'transparent',
                border:          '1.5px solid #fff',
                borderRadius:    '999px',
                color:           '#fff',
                padding:         '6px 18px',
                fontSize:        '13px',
                fontWeight:      600,
                cursor:          'pointer',
                transition:      'background 0.18s ease',
              }}
            >
              ← Back
            </button>

            {showCamera && (
              <>
                <p style={{ margin: 0, fontSize: '14px', color: '#9ca3af' }}>
                  Look at the camera. Detection will happen automatically.
                </p>
                <div style={{ borderRadius: '16px', overflow: 'hidden', border: '2px solid #dc2626' }}>
                  <video
                    ref={videoRef}
                    autoPlay
                    muted
                    playsInline
                    onCanPlay={() => setCameraReady(true)}
                    style={{ width: '100%', display: 'block' }}
                  />
                </div>
                {!cameraReady && (
                  <p style={{ margin: 0, fontSize: '13px', color: '#6b7280', textAlign: 'center' }}>
                    Starting camera...
                  </p>
                )}
              </>
            )}

            {qrUrl && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                <p style={{ margin: 0, fontSize: '14px', color: '#9ca3af', textAlign: 'center' }}>
                  Scan this QR code with your phone to link your face. Expires in 2 minutes.
                </p>
                <div style={{
                  backgroundColor: '#fff',
                  borderRadius:    '16px',
                  padding:         '16px',
                  display:         'inline-block',
                }}>
                  <QRCode value={qrUrl} size={200} />
                </div>
                <button
                  onClick={reset}
                  onMouseEnter={() => setHoveredRescan(true)}
                  onMouseLeave={() => setHoveredRescan(false)}
                  style={{
                    padding:         '11px 32px',
                    borderRadius:    '999px',
                    border:          'none',
                    backgroundColor: hoveredRescan ? '#b91c1c' : '#dc2626',
                    color:           '#fff',
                    fontWeight:      700,
                    fontSize:        '14px',
                    cursor:          'pointer',
                    transform:       hoveredRescan ? 'scale(1.03)' : 'scale(1)',
                    transition:      'background-color 0.18s ease, transform 0.18s ease',
                  }}
                >
                  Rescan
                </button>
              </div>
            )}

            {error && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  padding:         '10px 16px',
                  borderRadius:    '12px',
                  backgroundColor: 'rgba(220,38,38,0.15)',
                  color:           '#f87171',
                  fontSize:        '13px',
                  width:           '100%',
                  textAlign:       'center',
                }}>
                  {error}
                </div>
                <button
                  onClick={reset}
                  onMouseEnter={() => setHoveredTryAgain(true)}
                  onMouseLeave={() => setHoveredTryAgain(false)}
                  style={{
                    padding:         '11px 32px',
                    borderRadius:    '999px',
                    border:          'none',
                    backgroundColor: hoveredTryAgain ? '#b91c1c' : '#dc2626',
                    color:           '#fff',
                    fontWeight:      700,
                    fontSize:        '14px',
                    cursor:          'pointer',
                    transform:       hoveredTryAgain ? 'scale(1.03)' : 'scale(1)',
                    transition:      'background-color 0.18s ease, transform 0.18s ease',
                  }}
                >
                  Try again
                </button>
              </div>
            )}
          </>
        ) : (
          <>
            <p style={{ margin: 0, fontSize: '14px', color: '#9ca3af' }}>
              Please select a mode:
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <button
                onClick={() => switchMode('face-registration')}
                onMouseEnter={() => setHoveredRegister(true)}
                onMouseLeave={() => setHoveredRegister(false)}
                style={{
                  padding:         '13px',
                  borderRadius:    '999px',
                  border:          'none',
                  backgroundColor: hoveredRegister ? '#b91c1c' : '#dc2626',
                  color:           '#fff',
                  fontWeight:      700,
                  fontSize:        '15px',
                  cursor:          'pointer',
                  transform:       hoveredRegister ? 'scale(1.02)' : 'scale(1)',
                  transition:      'background-color 0.18s ease, transform 0.18s ease',
                }}
              >
                Face Registration
              </button>
              <button
                onClick={() => switchMode('attendance-check')}
                onMouseEnter={() => setHoveredAttendance(true)}
                onMouseLeave={() => setHoveredAttendance(false)}
                style={{
                  padding:         '13px',
                  borderRadius:    '999px',
                  border:          '1.5px solid #fff',
                  backgroundColor: hoveredAttendance ? 'rgba(255,255,255,0.12)' : 'transparent',
                  color:           '#fff',
                  fontWeight:      700,
                  fontSize:        '15px',
                  cursor:          'pointer',
                  transition:      'background-color 0.18s ease',
                }}
              >
                Attendance Check-in
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

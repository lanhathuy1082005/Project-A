import * as faceapi from 'face-api.js'
import { useRef, useEffect, useState, useCallback } from 'react'
import { faceCaptureApi, checkStudentIdApi, faceVerifyApi } from '../api/auth.api.js'
import { useToast } from '../components/Toast.jsx'

// ── Tuning constants ─────────────────────────────────────────────────────────
const HOLD_MS   = 2000   // ms face must stay in zone before capture
const MIN_RATIO = 0.15  // face-height / video-height — below this = too far
const MAX_RATIO = 0.99  // face-height / video-height — above this = too close

export default function Face() {
  // ── Refs ─────────────────────────────────────────────────────────────────
  const videoRef           = useRef(null)
  const streamRef          = useRef(null)
  const isRunningRef       = useRef(false)
  const detectedSinceRef   = useRef(null)
  const captureInProgress  = useRef(false)
  const resetTimerRef      = useRef(null)

  // ── State ─────────────────────────────────────────────────────────────────
  const [modelsLoaded, setModelsLoaded] = useState(false)
  const [mode,         setMode]         = useState(null)   // 'face-registration' | 'attendance-check'
  const [step,         setStep]         = useState('mode') // 'mode' | 'id-input' | 'scanning' | 'success'
  const [studentId,    setStudentId]    = useState('')
  const [idChecking,   setIdChecking]   = useState(false)
  const [idError,      setIdError]      = useState(null)
  const [cameraReady,  setCameraReady]  = useState(false)
  const [scanStatus,   setScanStatus]   = useState('idle')
  // idle | multiple | too-far | too-close | hold | capturing | fatal
  const [scanError,    setScanError]    = useState(null)
  const [holdProgress, setHoldProgress] = useState(0)   // 0–100
  const [successData,  setSuccessData]  = useState(null)
  const [resetSecs,    setResetSecs]    = useState(null)

  const addToast = useToast()

  // ── Load face-api models ──────────────────────────────────────────────────
  useEffect(() => {
    faceapi.nets.tinyFaceDetector.loadFromUri('/models')
      .then(() => setModelsLoaded(true))
      .catch(err => console.error('Model load failed:', err))
  }, [])

  // ── Camera helpers ────────────────────────────────────────────────────────
  const startCamera = useCallback(() => {
    navigator.mediaDevices.getUserMedia({ video: true })
      .then(stream => {
        streamRef.current = stream
        if (videoRef.current) videoRef.current.srcObject = stream
      })
      .catch(err => console.error('Camera error:', err))
  }, [])

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
    if (videoRef.current) videoRef.current.srcObject = null
    setCameraReady(false)
  }, [])

  // ── Start camera when entering scan step ─────────────────────────────────
  useEffect(() => {
    if (step !== 'scanning') return
    isRunningRef.current      = true
    detectedSinceRef.current  = null
    captureInProgress.current = false
    startCamera()
    return () => {
      isRunningRef.current = false
      stopCamera()
    }
  }, [step, startCamera, stopCamera])

  // ── Detection loop ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!modelsLoaded || !cameraReady || step !== 'scanning') return

    const interval = setInterval(async () => {
      if (!isRunningRef.current || captureInProgress.current) return

      const video = videoRef.current
      if (!video || video.readyState !== 4) return

      try {
        const canvas = document.createElement('canvas')
        canvas.width  = video.videoWidth
        canvas.height = video.videoHeight
        canvas.getContext('2d').drawImage(video, 0, 0)
        const dataUrl = canvas.toDataURL('image/jpeg')

        const img = new Image()
        img.src = dataUrl

        await new Promise((resolve) => {
          img.onload = async () => {
            if (!isRunningRef.current || captureInProgress.current) { resolve(); return }

            const detections = await faceapi.detectAllFaces(
              img,
              new faceapi.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.3 })
            )

            if (!isRunningRef.current || captureInProgress.current) { resolve(); return }

            // 0 faces
            if (detections.length === 0) {
              setScanStatus('idle'); detectedSinceRef.current = null; setHoldProgress(0)
              resolve(); return
            }

            // Multiple faces
            if (detections.length > 1) {
              setScanStatus('multiple'); detectedSinceRef.current = null; setHoldProgress(0)
              resolve(); return
            }

            // Single face — check proximity
            const ratio = detections[0].box.height / video.videoHeight

            if (ratio < MIN_RATIO) {
              setScanStatus('too-far'); detectedSinceRef.current = null; setHoldProgress(0)
              resolve(); return
            }
            if (ratio > MAX_RATIO) {
              setScanStatus('too-close'); detectedSinceRef.current = null; setHoldProgress(0)
              resolve(); return
            }

            // Face in correct zone — run hold timer
            const now = Date.now()
            if (!detectedSinceRef.current) detectedSinceRef.current = now
            const elapsed  = now - detectedSinceRef.current
            const progress = Math.min((elapsed / HOLD_MS) * 100, 100)
            setHoldProgress(progress)
            setScanStatus('hold')

            if (elapsed >= HOLD_MS) {
              captureInProgress.current = true
              setScanStatus('capturing')

              try {
                const { token } = await faceCaptureApi(dataUrl)
                const result    = await faceVerifyApi(studentId, token, mode)
                isRunningRef.current = false
                setSuccessData(result)
                setStep('success')

                // Auto-reset countdown
                let secs = 5
                setResetSecs(secs)
                resetTimerRef.current = setInterval(() => {
                  secs--
                  setResetSecs(secs)
                  if (secs <= 0) {
                    clearInterval(resetTimerRef.current)
                    resetTimerRef.current = null
                    resetAll()
                  }
                }, 1000)

              } catch (err) {
                if (err.status === 500) {
                  // Fatal server error — stop scanning, require explicit retry
                  isRunningRef.current = false
                  setScanStatus('fatal')
                  setScanError(err.message)
                } else {
                  // Non-fatal (400/401 etc.) — keep camera, let user try again automatically
                  setScanError(err.message)
                  detectedSinceRef.current  = null
                  setHoldProgress(0)
                  setScanStatus('idle')
                  captureInProgress.current = false
                }
              }
            }
            resolve()
          }
          img.onerror = () => resolve()
        })
      } catch (err) {
        console.error('Detection error:', err)
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [modelsLoaded, cameraReady, step, studentId, mode]) // eslint-disable-line

  // ── Helpers ───────────────────────────────────────────────────────────────
  const resetAll = () => {
    if (resetTimerRef.current) { clearInterval(resetTimerRef.current); resetTimerRef.current = null }
    isRunningRef.current      = false
    detectedSinceRef.current  = null
    captureInProgress.current = false
    stopCamera()
    setMode(null); setStep('mode'); setStudentId(''); setIdError(null)
    setScanStatus('idle'); setScanError(null); setHoldProgress(0)
    setSuccessData(null); setResetSecs(null)
  }

  // Retry after fatal error: restart camera and resume scanning
  const handleRetry = () => {
    setScanError(null)
    setScanStatus('idle')
    detectedSinceRef.current  = null
    captureInProgress.current = false
    setHoldProgress(0)
    isRunningRef.current = true
    stopCamera()    // sets cameraReady=false → interval cleanup
    startCamera()   // onCanPlay → cameraReady=true → new interval
  }

  const handleModeSelect = (m) => {
    setMode(m); setStep('id-input'); setStudentId(''); setIdError(null)
  }

  const handleCheckId = async () => {
    const trimmed = studentId.trim()
    if (!trimmed) return
    setIdChecking(true); setIdError(null)
    try {
      const { studentId: resolvedId } = await checkStudentIdApi(trimmed, mode)
      addToast(`Student found: ${resolvedId}`, 'success')
      setScanError(null); setScanStatus('idle'); setHoldProgress(0)
      detectedSinceRef.current = null
      setStep('scanning')
    } catch (err) {
      setIdError(err.message)
    } finally {
      setIdChecking(false)
    }
  }

  // ── Derived UI values ─────────────────────────────────────────────────────
  const ovalColor = (() => {
    if (scanStatus === 'hold')      return holdProgress >= 60 ? '#10b981' : '#fbbf24'
    if (scanStatus === 'capturing') return '#10b981'
    if (scanStatus === 'fatal')     return '#dc2626'
    if (scanStatus === 'idle')      return 'rgba(255,255,255,0.35)'
    if (scanStatus === 'too-far')   return '#60a5fa'   // blue = move closer
    if (scanStatus === 'too-close') return '#f87171'   // red  = move back
    return '#f87171'
  })()

  // dashed oval = too far (move closer), solid = too close or other error
  const ovalBorderStyle = scanStatus === 'too-far' ? 'dashed' : 'solid'

  const statusText = (() => {
    if (scanStatus === 'idle')      return 'Position your face inside the oval'
    if (scanStatus === 'multiple')  return 'Only one face allowed in frame'
    if (scanStatus === 'too-far')   return 'Move closer to the camera ↑'
    if (scanStatus === 'too-close') return 'Move back from the camera ↓'
    if (scanStatus === 'hold')      return `Hold still… ${Math.ceil((1 - holdProgress / 100) * HOLD_MS / 1000)}s`
    if (scanStatus === 'capturing') return 'Processing…'
    if (scanStatus === 'fatal')     return ''
    return ''
  })()

  const statusColor = (() => {
    if (scanStatus === 'idle')      return '#6b7280'
    if (scanStatus === 'hold')      return holdProgress >= 60 ? '#10b981' : '#fbbf24'
    if (scanStatus === 'capturing') return '#10b981'
    return '#f87171'
  })()

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={outerStyle}>
      <div style={cardStyle}>

        {/* Header */}
        <h2 style={{ margin: 0, fontWeight: 800, fontSize: '1.5rem', color: '#fff' }}>
          {step === 'mode'     && 'Face System'}
          {step === 'id-input' && (mode === 'face-registration' ? 'Face Registration' : 'Attendance Check-in')}
          {step === 'scanning' && (mode === 'face-registration' ? 'Face Registration' : 'Attendance Check-in')}
          {step === 'success'  && (mode === 'face-registration' ? 'Registration Complete' : 'Check-in Complete')}
        </h2>

        {/* ── MODE SELECTION ── */}
        {step === 'mode' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <p style={{ margin: 0, fontSize: '14px', color: '#9ca3af' }}>Select a mode to continue:</p>
            <button onClick={() => handleModeSelect('face-registration')} style={primaryBtn}>
              Face Registration
            </button>
            <button onClick={() => handleModeSelect('attendance-check')} style={outlineBtn}>
              Attendance Check-in
            </button>
          </div>
        )}

        {/* ── ID INPUT ── */}
        {step === 'id-input' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <button onClick={resetAll} style={backBtn}>← Back</button>
            <p style={{ margin: 0, fontSize: '14px', color: '#9ca3af' }}>
              {mode === 'face-registration'
                ? 'Enter the student ID to register a face for:'
                : 'Enter your student ID:'}
            </p>
            <input
              value={studentId}
              onChange={e => { setStudentId(e.target.value); setIdError(null) }}
              onKeyDown={e => e.key === 'Enter' && handleCheckId()}
              placeholder="e.g. B21DCCN001"
              style={inputStyle}
              autoFocus
            />
            {idError && <div style={errorBox}>{idError}</div>}
            <button
              onClick={handleCheckId}
              disabled={idChecking || !studentId.trim()}
              style={{
                ...primaryBtn,
                opacity: (idChecking || !studentId.trim()) ? 0.55 : 1,
                cursor: (idChecking || !studentId.trim()) ? 'not-allowed' : 'pointer',
              }}
            >
              {idChecking ? 'Checking…' : 'Proceed to Scan →'}
            </button>
          </div>
        )}

        {/* ── SCANNING ── */}
        {step === 'scanning' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <button onClick={resetAll} style={backBtn}>← Back</button>
            <p style={{ margin: 0, fontSize: '13px', color: '#6b7280' }}>
              Student ID: <span style={{ color: '#fff', fontWeight: 600 }}>{studentId}</span>
            </p>

            {/* Video + oval overlay */}
            <div style={{ position: 'relative', borderRadius: '16px', overflow: 'hidden', background: '#000' }}>
              <video
                ref={videoRef}
                autoPlay muted playsInline
                onCanPlay={() => setCameraReady(true)}
                style={{ width: '100%', display: 'block', maxHeight: '320px', objectFit: 'cover' }}
              />
              {/* Oval guide with dark surround */}
              <div style={{
                position: 'absolute', inset: 0,
                display: 'flex', justifyContent: 'center', alignItems: 'center',
                pointerEvents: 'none',
              }}>
                <div style={{
                  width: '54%',
                  aspectRatio: '3/4',
                  borderRadius: '50%',
                  border: `3px ${ovalBorderStyle} ${ovalColor}`,
                  boxShadow: `0 0 0 2000px rgba(0,0,0,0.42)`,
                  transition: 'border-color 0.25s ease, border-style 0.25s ease',
                }} />
              </div>
              {/* Status overlay — shown inside the video so it's impossible to miss */}
              {cameraReady && statusText && scanStatus !== 'hold' && scanStatus !== 'capturing' && (
                <div style={{
                  position: 'absolute', bottom: '12px', left: 0, right: 0,
                  display: 'flex', justifyContent: 'center', pointerEvents: 'none',
                }}>
                  <span style={{
                    backgroundColor: 'rgba(0,0,0,0.65)',
                    color: statusColor,
                    fontSize: '13px', fontWeight: 600,
                    padding: '5px 14px', borderRadius: '999px',
                    backdropFilter: 'blur(4px)',
                  }}>
                    {statusText}
                  </span>
                </div>
              )}
              {/* Camera loading overlay */}
              {!cameraReady && (
                <div style={{
                  position: 'absolute', inset: 0, display: 'flex',
                  justifyContent: 'center', alignItems: 'center', background: '#111',
                }}>
                  <span style={{ color: '#6b7280', fontSize: '13px' }}>Starting camera…</span>
                </div>
              )}
            </div>

            {/* Hold progress bar */}
            {scanStatus === 'hold' && (
              <div style={{ height: '4px', background: '#2d2d2d', borderRadius: '2px', overflow: 'hidden' }}>
                <div style={{
                  height: '100%', width: `${holdProgress}%`,
                  background: holdProgress >= 60 ? '#10b981' : '#fbbf24',
                  transition: 'width 0.1s linear, background 0.3s ease',
                  borderRadius: '2px',
                }} />
              </div>
            )}

            {/* Status message — only show below video for hold/capturing states */}
            {(scanStatus === 'hold' || scanStatus === 'capturing') && statusText && (
              <p style={{ margin: 0, fontSize: '13px', textAlign: 'center', color: statusColor }}>
                {statusText}
              </p>
            )}

            {/* Scan error + retry (non-fatal: inline only; fatal: show retry button) */}
            {scanError && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'center' }}>
                <div style={errorBox}>{scanError}</div>
                {scanStatus === 'fatal' && (
                  <button onClick={handleRetry} style={primaryBtn}>
                    Retry
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── SUCCESS ── */}
        {step === 'success' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center' }}>
            <div style={{
              width: '64px', height: '64px', borderRadius: '50%',
              background: 'rgba(16,185,129,0.15)', border: '2px solid #10b981',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '28px',
            }}>✓</div>

            <p style={{ margin: 0, fontSize: '15px', color: '#10b981', fontWeight: 700, textAlign: 'center' }}>
              {mode === 'face-registration' ? 'Face registered successfully!' : 'Attendance recorded!'}
            </p>

            <div style={{
              width: '100%', background: '#1a1a1a', borderRadius: '12px',
              padding: '16px', fontSize: '13px', color: '#9ca3af',
              display: 'flex', flexDirection: 'column', gap: '8px',
            }}>
              <span>Student ID: <strong style={{ color: '#fff' }}>{studentId}</strong></span>
              {successData?.data?.timetable_id && (
                <span>Class ID: <strong style={{ color: '#fff' }}>{successData.data.timetable_id}</strong></span>
              )}
              {successData?.data?.checked_in_at && (
                <span>
                  Check-in time:{' '}
                  <strong style={{ color: '#fff' }}>
                    {new Date(successData.data.checked_in_at).toLocaleString('vi-VN')}
                  </strong>
                </span>
              )}
            </div>

            {resetSecs !== null && (
              <p style={{ margin: 0, fontSize: '12px', color: '#4b5563' }}>
                Returning to home in {resetSecs}s…
              </p>
            )}

            <button onClick={resetAll} style={{ ...outlineBtn, width: '100%' }}>Done</button>
          </div>
        )}

      </div>
    </div>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────
const outerStyle = {
  display: 'flex', flexDirection: 'column',
  justifyContent: 'center', alignItems: 'center',
  minHeight: '100vh', backgroundColor: '#f3f4f6', padding: '24px',
}
const cardStyle = {
  backgroundColor: '#111', borderRadius: '24px',
  padding: '36px 32px', width: '100%', maxWidth: '420px',
  display: 'flex', flexDirection: 'column', gap: '20px', color: '#fff',
}
const primaryBtn = {
  padding: '13px', borderRadius: '999px', border: 'none',
  backgroundColor: '#dc2626', color: '#fff',
  fontWeight: 700, fontSize: '15px', cursor: 'pointer',
  transition: 'background-color 0.18s ease',
}
const outlineBtn = {
  padding: '11px 28px', borderRadius: '999px',
  border: '1.5px solid #fff', backgroundColor: 'transparent',
  color: '#fff', fontWeight: 700, fontSize: '14px', cursor: 'pointer',
  alignSelf: 'center',
}
const backBtn = {
  alignSelf: 'flex-start', background: 'transparent',
  border: '1.5px solid #fff', borderRadius: '999px',
  color: '#fff', padding: '6px 18px',
  fontSize: '13px', fontWeight: 600, cursor: 'pointer',
}
const inputStyle = {
  padding: '12px 16px', borderRadius: '12px',
  border: '1.5px solid #333', backgroundColor: '#1a1a1a',
  color: '#fff', fontSize: '14px', outline: 'none',
  width: '100%', boxSizing: 'border-box',
}
const errorBox = {
  padding: '10px 16px', borderRadius: '10px',
  backgroundColor: 'rgba(220,38,38,0.15)',
  color: '#f87171', fontSize: '13px', textAlign: 'center',
  width: '100%', boxSizing: 'border-box',
}
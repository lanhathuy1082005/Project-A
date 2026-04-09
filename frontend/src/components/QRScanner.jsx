import { useState } from 'react'
import { Scanner }  from '@yudiel/react-qr-scanner'
import { TbQrcode } from 'react-icons/tb'

export default function QRScanner({ onResult, actionError }) {
  const [cameraFailed, setCameraFailed] = useState(null)
  const [scannedId,    setScannedId]    = useState(null)
  const [manualId,     setManualId]     = useState('')
  const [scanError,    setScanError]    = useState(null)
  const [hoveredConfirm, setHoveredConfirm] = useState(false)
  const [hoveredCancel,  setHoveredCancel]  = useState(false)

  const handleScan = (results) => {
    if (!results?.length) return
    const raw = results[0].rawValue
    const id  = parseInt(raw)
    if (isNaN(id) || id <= 0) {
      setScanError('Invalid QR code. Please try again.')
      return
    }
    setScanError(null)
    setScannedId(id)
  }

  const cancelScan = () => {
    setScannedId(null)
    setManualId('')
    setScanError(null)
  }

  const value   = scannedId ?? (manualId ? parseInt(manualId, 10) : null)
  const isValid = value && !isNaN(value) && value > 0

  return (
    <div style={{
      backgroundColor: '#111',
      borderRadius:    '24px',
      padding:         '36px 32px',
      width:           '100%',
      maxWidth:        '420px',
      display:         'flex',
      flexDirection:   'column',
      gap:             '20px',
      color:           '#fff',
    }}>

      {/* Title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <TbQrcode size={28} color="#dc2626" />
        <h2 style={{ margin: 0, fontWeight: 800, fontSize: '1.5rem' }}>QR Scan</h2>
      </div>

      <p style={{ margin: 0, fontSize: '14px', color: '#9ca3af' }}>
        Point your camera at the item's QR code to borrow it.
      </p>

      {/* Camera / scanner */}
      {!cameraFailed && !scannedId && (
        <div style={{ borderRadius: '16px', overflow: 'hidden', border: '2px solid #dc2626' }}>
          <Scanner
            onScan={handleScan}
            onError={() => setCameraFailed(true)}
            styles={{ container: { borderRadius: '0', overflow: 'hidden' } }}
          />
        </div>
      )}

      {/* Manual fallback */}
      {cameraFailed && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <p style={{ margin: 0, fontSize: '13px', color: '#f87171' }}>
            Camera unavailable (requires HTTPS). Enter ID manually:
          </p>
          <input
            type="number"
            placeholder="Enter Item Unit ID..."
            value={manualId}
            onChange={(e) => setManualId(e.target.value)}
            autoFocus
            style={{
              padding:         '12px 18px',
              borderRadius:    '999px',
              border:          '2px solid #dc2626',
              backgroundColor: '#1f1f1f',
              color:           '#fff',
              fontSize:        '14px',
              outline:         'none',
              width:           '100%',
              boxSizing:       'border-box',
            }}
          />
        </div>
      )}

      {/* Scanned result */}
      {scannedId && (
        <div style={{
          padding:         '12px 18px',
          borderRadius:    '12px',
          backgroundColor: '#1f2d1f',
          border:          '1px solid #22c55e',
          color:           '#86efac',
          fontSize:        '14px',
        }}>
          Scanned: Item Unit ID <strong>{scannedId}</strong>
        </div>
      )}

      {/* Scan error */}
      {scanError && (
        <div style={{
          padding:         '10px 16px',
          borderRadius:    '12px',
          backgroundColor: 'rgba(220,38,38,0.15)',
          color:           '#f87171',
          fontSize:        '13px',
        }}>
          {scanError}
        </div>
      )}

      {/* Action error */}
      {actionError && (
        <div style={{
          padding:         '10px 16px',
          borderRadius:    '12px',
          backgroundColor: 'rgba(220,38,38,0.15)',
          color:           '#f87171',
          fontSize:        '13px',
        }}>
          {actionError}
        </div>
      )}

      {/* Buttons */}
      <div style={{ display: 'flex', gap: '12px' }}>
        <button
          onClick={() => onResult(value)}
          disabled={!isValid}
          onMouseEnter={() => isValid && setHoveredConfirm(true)}
          onMouseLeave={() => setHoveredConfirm(false)}
          style={{
            flex:            1,
            padding:         '12px',
            borderRadius:    '999px',
            border:          'none',
            backgroundColor: !isValid ? '#3f3f3f' : hoveredConfirm ? '#b91c1c' : '#dc2626',
            color:           !isValid ? '#6b7280' : '#fff',
            fontWeight:      700,
            fontSize:        '14px',
            cursor:          isValid ? 'pointer' : 'not-allowed',
            transition:      'background-color 0.18s ease, transform 0.18s ease',
            transform:       hoveredConfirm && isValid ? 'scale(1.03)' : 'scale(1)',
          }}
        >
          Confirm
        </button>
        <button
          onClick={cancelScan}
          disabled={!isValid}
          onMouseEnter={() => isValid && setHoveredCancel(true)}
          onMouseLeave={() => setHoveredCancel(false)}
          style={{
            flex:            1,
            padding:         '12px',
            borderRadius:    '999px',
            border:          '1.5px solid',
            borderColor:     !isValid ? '#3f3f3f' : '#fff',
            backgroundColor: hoveredCancel && isValid ? 'rgba(255,255,255,0.12)' : 'transparent',
            color:           !isValid ? '#6b7280' : '#fff',
            fontWeight:      600,
            fontSize:        '14px',
            cursor:          isValid ? 'pointer' : 'not-allowed',
            transition:      'background-color 0.18s ease',
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

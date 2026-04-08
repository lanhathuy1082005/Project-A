import { useState} from 'react'
import { Scanner }              from '@yudiel/react-qr-scanner'

/**
 * QR Scanner với fallback manual input khi camera không khả dụng (non-HTTPS).
 *
 * Props:
 *   pendingLabel — tên item đang được xử lý
 *   buttonText   — text nút xác nhận
 *   onResult     — callback(id: number)
 *   onCancel     — callback()
 *   actionError  — string | null — lỗi từ action (borrow/return thất bại)
 */
export default function QRScanner({ onResult, actionError }) {
  const [cameraFailed, setCameraFailed] = useState(null)   
  const [scannedId,     setScannedId]     = useState(null)
  const [manualId,      setManualId]      = useState('')
  const [scanError,     setScanError]     = useState(null)

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

  const value = scannedId ?? (manualId ? parseInt(manualId, 10) : null)
  const isValid = value && !isNaN(value) && value > 0

  return (
    <div >
      <div >
        <h3 >Scan your item</h3>


        {!cameraFailed && !scannedId && (
          <Scanner
            onScan={handleScan}
            onError={() => {setCameraFailed(true);}}
            styles={{ container: { borderRadius: '8px', overflow: 'hidden' } }}
          />
        )}

        {cameraFailed && (
          <div >
            <p>
              Camera unavailable (requires HTTPS). Enter ID manually:
            </p>
            <input
              type="number"
              placeholder="Enter Item Unit ID..."
              value={manualId}
              onChange={(e) => setManualId(e.target.value)}
              autoFocus
            />
          </div>
        )}

        {/* Đã quét thành công */}
        {scannedId && (
          <p>
            Scanned: Item Unit ID <strong>{scannedId}</strong>
          </p>
        )}

        {/* Lỗi scan */}
        {scanError && (
          <p>
            {scanError}
          </p>
        )}

        {/* Lỗi action (borrow/return thất bại) */}
        {actionError && (
          <p>
            {actionError}
          </p>
        )}

        {/* Buttons */}
        <div>
          <button
            onClick={() => onResult(value)}
            disabled={!isValid}
          >
            Confirm
          </button>
          <button 
            onClick={cancelScan} 
            disabled={!isValid}>
            Huỷ
          </button>
        </div>
      </div>
    </div>
  )
}

import { useState } from "react";
import {Scanner} from '@yudiel/react-qr-scanner';

export default function ItemQRScanner({ pendingItem, buttonText, confirmScan, cancelScan }) {
    const [scannedId, setScannedId] = useState(null);
    const [error, setError] = useState(null);
  
    const handleScan = (results) => {
      if (results?.length > 0) {
        setScannedId(Number(results[0].rawValue));
      }
      console.log(scannedId);
    };
  
    return (
        <div>
            <h2>Scan Item QR Code</h2>
            <p>Scanning for: <strong>{pendingItem?.name ?? pendingItem?.item_unit_id}</strong></p>
            
            {!scannedId ? (
                <Scanner
                onScan={handleScan}
                onError={(err) => setError(err?.message ?? 'Camera error')}
                />
                ) : (
                <p>Scanned ID: <strong>{scannedId}</strong></p>
                )}
            
                {error && <p>{error}</p>}
            
                <button onClick={() => confirmScan(scannedId)} disabled={!scannedId}>
                        {buttonText}
                </button>
                <button onClick={cancelScan}>Cancel</button>
        </div>
    );
}
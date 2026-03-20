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
        <div style={{
            position: 'fixed', inset: 0,
            backgroundColor: 'rgba(0,0,0,0.7)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000,
        }}>
            <div style={{
                backgroundColor: '#111',
                borderRadius: '20px',
                padding: '32px',
                width: '100%',
                maxWidth: '420px',
                color: '#fff',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
            }}>
                <div>
                    <h2 style={{ fontSize: '1.3rem', fontWeight: '800', margin: 0 }}>Scan Item QR Code</h2>
                    <p style={{ color: '#9ca3af', fontSize: '0.9rem', marginTop: '4px' }}>
                        Scanning for: <strong style={{ color: '#fff' }}>{pendingItem?.name ?? pendingItem?.item_unit_id}</strong>
                    </p>
                </div>

                <div style={{ borderRadius: '12px', overflow: 'hidden', border: '2px solid #dc2626' }}>
                    {!scannedId ? (
                        <Scanner
                            onScan={handleScan}
                            onError={(err) => setError(err?.message ?? 'Camera error')}
                        />
                    ) : (
                        <div style={{ padding: '32px', textAlign: 'center', backgroundColor: '#1f2937', borderRadius: '10px' }}>
                            <p style={{ color: '#9ca3af', marginBottom: '8px', fontSize: '0.9rem' }}>Scanned ID</p>
                            <p style={{ fontSize: '2rem', fontWeight: '800', color: '#22c55e' }}>{scannedId}</p>
                        </div>
                    )}
                </div>

                {error && (
                    <p style={{ color: '#f87171', fontSize: '0.85rem', textAlign: 'center' }}>{error}</p>
                )}

                <div style={{ display: 'flex', gap: '12px', marginTop: '4px' }}>
                    <button
                        onClick={cancelScan}
                        style={{
                            flex: 1, padding: '12px',
                            backgroundColor: 'transparent',
                            border: '1.5px solid #fff',
                            borderRadius: '999px',
                            color: '#fff',
                            fontWeight: '700',
                            fontSize: '0.95rem',
                            cursor: 'pointer',
                        }}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={() => confirmScan(scannedId)}
                        disabled={!scannedId}
                        style={{
                            flex: 1, padding: '12px',
                            backgroundColor: scannedId ? '#dc2626' : '#4b5563',
                            border: 'none',
                            borderRadius: '999px',
                            color: '#fff',
                            fontWeight: '700',
                            fontSize: '0.95rem',
                            cursor: scannedId ? 'pointer' : 'not-allowed',
                        }}
                    >
                        {buttonText}
                    </button>
                </div>
            </div>
        </div>
    );
}
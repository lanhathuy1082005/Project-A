import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { getErrorMessage } from '@/api/client';
import { AppButton } from '@/components/ui/AppButton';
import { InlineNotice } from '@/components/ui/InlineNotice';
import { Colors, Spacing } from '@/constants/theme';

interface QRScannerProps {
  actionLabel: string;
  busy: boolean;
  error: string | null;
  onConfirm: (unitId: number) => void;
}

function parseUnitId(value: string): number | null {
  const trimmed = value.trim();
  if (!/^\d+$/.test(trimmed)) return null;

  const parsed = Number(trimmed);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

export function QRScanner({
  actionLabel,
  busy,
  error,
  onConfirm,
}: QRScannerProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [scannedUnitId, setScannedUnitId] = useState<number | null>(null);
  const [manualUnitId, setManualUnitId] = useState('');
  const [cameraReady, setCameraReady] = useState(false);
  const permissionRequested = useRef(false);
  const parsedManualUnitId = parseUnitId(manualUnitId);

  const requestCameraPermission = useCallback(async () => {
    setPermissionError(null);
    setCameraError(null);
    try {
      const result = await requestPermission();
      if (!result.granted) {
        setPermissionError('Camera permission was not granted.');
      }
    } catch (requestError) {
      setPermissionError(
        getErrorMessage(requestError, 'Could not request camera permission.'),
      );
    }
  }, [requestPermission]);

  useEffect(() => {
    if (
      !permission ||
      permission.granted ||
      !permission.canAskAgain ||
      permissionRequested.current
    ) {
      return;
    }

    permissionRequested.current = true;
    void requestCameraPermission();
  }, [permission, requestCameraPermission]);

  const handleBarcodeScanned = ({ data }: { data: string }) => {
    const unitId = parseUnitId(data);
    if (unitId === null) {
      setScanError('Invalid QR code. Scan a numeric item unit ID.');
      return;
    }
    setScanError(null);
    setScannedUnitId(unitId);
  };

  const handleManualUnitIdChange = (value: string) => {
    setManualUnitId(value);
    setScanError(
      value.trim() && parseUnitId(value) === null
        ? 'Enter a positive numeric item unit ID.'
        : null,
    );
  };

  const showCamera =
    permission?.granted === true &&
    cameraError === null &&
    scannedUnitId === null;
  const cameraUnavailable =
    permission?.granted !== true || cameraError !== null;
  const cameraUnavailableMessage = permissionError
    ? `${permissionError} Enter the item ID manually below.`
    : cameraError
      ? `Camera unavailable: ${cameraError}`
      : permission && !permission.granted && !permission.canAskAgain
        ? 'Allow camera access in your device or browser settings, then retry. You can also enter the item ID manually below.'
        : 'Camera permission is needed to scan. Enter the item ID manually below.';

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Scan item QR code</Text>
      <Text style={styles.description}>
        The scanned unit ID will be shown for confirmation before continuing.
      </Text>

      {permission === null ? (
        <View style={styles.loading}>
          <ActivityIndicator accessibilityLabel="Checking camera permission" />
          <Text style={styles.description}>Checking camera permission...</Text>
        </View>
      ) : showCamera ? (
        <View style={styles.cameraFrame}>
          <CameraView
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            facing={Platform.OS === 'web' ? 'front' : 'back'}
            onBarcodeScanned={handleBarcodeScanned}
            onCameraReady={() => setCameraReady(true)}
            onMountError={({ message }) => {
              setCameraReady(false);
              setCameraError(message);
            }}
            style={styles.camera}
          />
          {!cameraReady ? (
            <View style={styles.cameraLoading}>
              <ActivityIndicator accessibilityLabel="Opening camera" />
              <Text style={styles.loadingText}>Opening camera...</Text>
            </View>
          ) : null}
        </View>
      ) : scannedUnitId === null ? (
        <View style={styles.permissionMessage}>
          <InlineNotice
            message={cameraUnavailableMessage}
            tone={cameraUnavailable ? 'error' : 'info'}
          />
          {cameraUnavailable ? (
            <TextInput
              accessibilityLabel="Item unit ID"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!busy}
              keyboardType="number-pad"
              onChangeText={handleManualUnitIdChange}
              placeholder="Item unit ID"
              returnKeyType="done"
              style={styles.input}
              value={manualUnitId}
            />
          ) : null}
          {permission ? (
            <AppButton
              label="Retry camera"
              onPress={() => void requestCameraPermission()}
              variant="secondary"
            />
          ) : null}
        </View>
      ) : (
        <Text style={styles.scannedResult}>
          Scanned item unit ID: {scannedUnitId}
        </Text>
      )}

      {scanError ? <InlineNotice message={scanError} tone="error" /> : null}
      {error ? <InlineNotice message={error} tone="error" /> : null}
      {scannedUnitId !== null || parsedManualUnitId !== null ? (
        <View style={styles.actions}>
          <AppButton
            label={actionLabel}
            onPress={() => {
              const unitId = scannedUnitId ?? parsedManualUnitId;
              if (unitId !== null) onConfirm(unitId);
            }}
            disabled={scannedUnitId === null && parsedManualUnitId === null}
            busy={busy}
          />
          <AppButton
            label="Scan again"
            onPress={() => {
              setScannedUnitId(null);
              setManualUnitId('');
              setScanError(null);
            }}
            disabled={busy}
            variant="secondary"
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.two,
    padding: Spacing.three,
    borderWidth: 1,
    borderColor: Colors.light.backgroundSelected,
    borderRadius: 12,
    backgroundColor: Colors.light.background,
  },
  title: {
    color: Colors.light.text,
    fontSize: 18,
    fontWeight: '700',
  },
  description: {
    color: Colors.light.textSecondary,
  },
  loading: {
    minHeight: 140,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
  },
  camera: {
    width: '100%',
    height: 260,
    borderRadius: 8,
    overflow: 'hidden',
  },
  cameraFrame: {
    position: 'relative',
    minHeight: 220,
  },
  cameraLoading: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    backgroundColor: Colors.light.backgroundElement,
  },
  loadingText: {
    color: Colors.light.textSecondary,
  },
  permissionMessage: {
    gap: Spacing.two,
  },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: Colors.light.textSecondary,
    borderRadius: 8,
    paddingHorizontal: Spacing.three,
    color: Colors.light.text,
  },
  scannedResult: {
    padding: Spacing.two,
    borderRadius: 8,
    backgroundColor: Colors.light.backgroundElement,
    color: Colors.light.text,
    fontWeight: '600',
  },
  actions: {
    gap: Spacing.two,
  },
});

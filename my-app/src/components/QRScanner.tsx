import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { File } from 'expo-file-system';
import {
  CameraView,
  useCameraPermissions,
  type CameraCapturedPicture,
  type BarcodeScanningResult,
} from 'expo-camera';
import { useIsFocused } from 'expo-router';
import { ApiError, getErrorMessage } from '@/api/client';
import {
  RETURN_FLAG_LABELS,
  getAvailableKitsApi,
  resolveUnitApi,
  verifyKitFrameApi,
  verifySingleFrameApi,
  type AvailableKit,
  type KitScanResult,
  type ResolvedUnit,
  type ScanConfirmation,
  type ScanPurpose,
  type SingleScanResult,
} from '@/api/reservation.api';
import { AppButton } from '@/components/ui/AppButton';
import { InlineNotice } from '@/components/ui/InlineNotice';
import { Colors, Spacing } from '@/constants/theme';
import { parseQrToken } from '@/utils/qr';

interface QRScannerProps {
  purpose: ScanPurpose;
  // Required for returns: the loan being closed. A single item's scanned QR must be
  // its unit; a kit is checked by contents only, so the camera starts counting at once.
  reservation?: { id: number; itemUnitId: number; isKit: boolean; itemName: string };
  actionLabel: string;
  busy: boolean;
  error: string | null;
  onConfirm: (confirmation: ScanConfirmation) => void;
}

type ScannerPhase = 'scanning' | 'resolving' | 'polling' | 'official' | 'complete';
type ScanMode = 'single' | 'kit';

interface ScanTarget extends ResolvedUnit {
  // Absent for a kit picked from the list and for kit returns.
  qrText?: string;
  token?: string;
}

function kitReturnTarget(reservation: QRScannerProps['reservation']): ScanTarget | null {
  if (!reservation?.isKit) return null;
  return {
    item_unit_id: reservation.itemUnitId,
    is_kit: true,
    item_name: reservation.itemName,
    status: 'Borrowed',
    slot_count: null,
  };
}

type FrameResult =
  | { kind: 'kit'; result: KitScanResult }
  | { kind: 'single'; result: SingleScanResult };

const SUCCESS_FRAMES_REQUIRED = 3;
const POLL_DELAY_MS = 400;
// Slightly above the backend's model timeouts (3 s preview, 15 s official).
const PREVIEW_TIMEOUT_MS = 4000;
const OFFICIAL_TIMEOUT_MS = 17000;
const BORROWABLE = ['Available', 'Needs Checking'];

function parsePictureSize(value: string): { value: string; width: number; height: number } | null {
  const match = /^(\d+)x(\d+)$/.exec(value);
  if (!match) return null;
  return { value, width: Number(match[1]), height: Number(match[2]) };
}

function choosePreviewSize(sizes: string[]): string | null {
  const parsed = sizes.map(parsePictureSize).filter((size) => size !== null);
  parsed.sort(
    (left, right) =>
      Math.abs(left.width - 640) - Math.abs(right.width - 640)
      || Math.abs(left.height - 480) - Math.abs(right.height - 480),
  );
  return parsed[0]?.value ?? null;
}

function chooseFullResolutionSize(sizes: string[]): string | null {
  return sizes
    .map(parsePictureSize)
    .filter((size) => size !== null)
    .sort((left, right) => right.width * right.height - left.width * left.height)[0]
    ?.value ?? null;
}

async function removeTemporaryCapture(picture: CameraCapturedPicture) {
  if (Platform.OS === 'web' || !picture.uri.startsWith('file://')) return;
  const file = new File(picture.uri);
  if (file.exists) file.delete();
}

// 502/503 from the backend mean the scan model is down or failing, not the item.
function isModelUnavailable(error: unknown): boolean {
  return error instanceof ApiError && (error.status === 502 || error.status === 503);
}

function frameMessage(frame: FrameResult, purpose: ScanPurpose): string {
  if (frame.kind === 'kit') {
    const r = frame.result;
    if (r.status === 'unsure') return 'Tilt the box so its contents can be checked clearly.';
    if (r.status === 'wrong') return 'The counts do not match the kit slots. Reframe and scan again.';
    if (purpose === 'checkout' && r.fully_empty) return 'This kit is completely empty and cannot be borrowed.';
    if (purpose === 'return' && r.return_flag === 'count_mismatch')
      return 'The kit contents differ from when you borrowed it.';
    return 'Counts look clear.';
  }
  const r = frame.result;
  if (r.status === 'wrong') return `The camera sees ${r.detected_item_class}, which is not this item.`;
  if (r.status === 'unsure') return 'Keep one item and its QR code clearly in frame.';
  return 'The QR code and the item match.';
}

function scanIdOf(frame: FrameResult): number | null {
  return frame.kind === 'kit' ? frame.result.kit_scan_id : frame.result.single_scan_id;
}

export function QRScanner({
  purpose,
  reservation,
  actionLabel,
  busy,
  error,
  onConfirm,
}: QRScannerProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [modelUnavailable, setModelUnavailable] = useState(false);
  const initialTarget = purpose === 'return' ? kitReturnTarget(reservation) : null;
  const [mode, setMode] = useState<ScanMode>(initialTarget ? 'kit' : 'single');
  const [kits, setKits] = useState<AvailableKit[]>([]);
  const [kitQrRequired, setKitQrRequired] = useState(false);
  const [kitsLoading, setKitsLoading] = useState(false);
  const [kitsError, setKitsError] = useState<string | null>(null);
  const [target, setTarget] = useState<ScanTarget | null>(initialTarget);
  const [phase, setPhase] = useState<ScannerPhase>(initialTarget ? 'polling' : 'scanning');
  const [cameraReady, setCameraReady] = useState(false);
  const [appActive, setAppActive] = useState(AppState.currentState === 'active');
  const [latest, setLatest] = useState<FrameResult | null>(null);
  const [consecutiveSuccesses, setConsecutiveSuccesses] = useState(0);
  const [confirmation, setConfirmation] = useState<ScanConfirmation | null>(null);
  const [pictureSize, setPictureSize] = useState<string | undefined>();
  const [fullResolutionSize, setFullResolutionSize] = useState<string | null>(null);
  const [cameraKey, setCameraKey] = useState(0);
  const cameraRef = useRef<CameraView>(null);
  const cameraSizesLoaded = useRef(false);
  const permissionRequested = useRef(false);
  const targetRef = useRef<ScanTarget | null>(initialTarget);
  const resolvingRef = useRef(false);
  // Last time a different QR code was seen while checking this target.
  const foreignQrAt = useRef(0);
  const isFocused = useIsFocused();

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      setAppActive(nextState === 'active');
    });
    return () => subscription.remove();
  }, []);

  const requestCameraPermission = useCallback(async () => {
    setPermissionError(null);
    setCameraError(null);
    try {
      const result = await requestPermission();
      if (!result.granted) setPermissionError('Camera permission was not granted.');
    } catch (requestError) {
      setPermissionError(getErrorMessage(requestError, 'Could not request camera permission.'));
    }
  }, [requestPermission]);

  useEffect(() => {
    if (!permission || permission.granted || !permission.canAskAgain || permissionRequested.current) {
      return;
    }
    permissionRequested.current = true;
    void requestCameraPermission();
  }, [permission, requestCameraPermission]);

  const handleCameraReady = useCallback(async () => {
    if (!cameraSizesLoaded.current) {
      cameraSizesLoaded.current = true;
      try {
        const sizes = await cameraRef.current?.getAvailablePictureSizesAsync();
        const previewSize = sizes ? choosePreviewSize(sizes) : null;
        setFullResolutionSize(sizes ? chooseFullResolutionSize(sizes) : null);
        if (previewSize && previewSize !== pictureSize) {
          setCameraReady(false);
          setPictureSize(previewSize);
          setCameraKey((key) => key + 1);
          return;
        }
      } catch (sizeError) {
        setCameraError(getErrorMessage(sizeError, 'Could not configure camera resolution.'));
        setCameraReady(false);
        return;
      }
    }
    setCameraReady(true);
  }, [pictureSize]);

  const loadKits = useCallback(async () => {
    setKitsLoading(true);
    setKitsError(null);
    try {
      const result = await getAvailableKitsApi();
      setKits(result.kits);
      setKitQrRequired(result.kitQrRequired);
    } catch (loadError) {
      setKitsError(getErrorMessage(loadError, 'Could not load available kits.'));
    } finally {
      setKitsLoading(false);
    }
  }, []);

  // Kit checkout without stickers: the student picks the box from the list.
  const kitPickerVisible = purpose === 'checkout' && mode === 'kit' && !kitQrRequired && target === null;

  const selectKit = (kit: AvailableKit) => {
    const next: ScanTarget = {
      item_unit_id: kit.unit_id,
      is_kit: true,
      item_name: kit.item_name,
      status: kit.status,
      slot_count: kit.slot_count,
    };
    targetRef.current = next;
    foreignQrAt.current = 0;
    setTarget(next);
    setLatest(null);
    setScanError(null);
    setConsecutiveSuccesses(0);
    setPhase('polling');
  };

  const resolveTarget = useCallback(async (qrText: string, token: string) => {
    resolvingRef.current = true;
    setPhase('resolving');
    setScanError(null);
    try {
      const unit = await resolveUnitApi(qrText);
      if (purpose === 'return' && reservation && unit.item_unit_id !== reservation.itemUnitId) {
        throw new Error('This QR code belongs to a different item than the one you are returning.');
      }
      if (purpose === 'checkout' && mode === 'single' && unit.is_kit) {
        throw new Error('This QR code is on a kit. Switch to Kit mode.');
      }
      if (purpose === 'checkout' && mode === 'kit' && !unit.is_kit) {
        throw new Error('This QR code is on a single item. Switch to Single item mode.');
      }
      if (purpose === 'checkout' && !BORROWABLE.includes(unit.status)) {
        throw new Error(`${unit.item_name} is not available to borrow right now.`);
      }
      const next = { ...unit, qrText, token };
      targetRef.current = next;
      foreignQrAt.current = 0;
      setTarget(next);
      setLatest(null);
      setConsecutiveSuccesses(0);
      setPhase('polling');
    } catch (resolveError) {
      setScanError(getErrorMessage(resolveError, 'Could not look up this QR code.'));
      setPhase('scanning');
    } finally {
      resolvingRef.current = false;
    }
  }, [mode, purpose, reservation]);

  const handleBarcodeScanned = useCallback(({ data }: BarcodeScanningResult) => {
    const token = parseQrToken(data);
    const current = targetRef.current;
    if (current) {
      // Another sticker in view while checking: don't count this frame towards the streak.
      if (token && current.token && token !== current.token) foreignQrAt.current = Date.now();
      return;
    }
    if (resolvingRef.current || kitPickerVisible) return;
    if (!token) {
      setScanError('This is not a lab item QR code.');
      return;
    }
    void resolveTarget(data.trim(), token);
  }, [kitPickerVisible, resolveTarget]);

  // Self-throttling capture loop: one request in flight; N clear frames in a row,
  // then one full-resolution official frame that the server saves.
  useEffect(() => {
    if (phase !== 'polling' && phase !== 'official') return;
    if (!target || !cameraReady || !isFocused || !appActive || busy || cameraError) return;

    let cancelled = false;
    let controller: AbortController | null = null;
    let consecutive = 0;
    const official = phase === 'official';

    const captureFrame = async (): Promise<string> => {
      const camera = cameraRef.current;
      if (!camera) throw new Error('Camera is not ready.');
      const picture = await camera.takePictureAsync({
        quality: official ? 0.9 : 0.25,
        base64: true,
        exif: false,
        shutterSound: false,
      });
      try {
        if (!picture.base64) throw new Error('Camera did not provide image data.');
        return picture.base64;
      } finally {
        await removeTemporaryCapture(picture).catch(() => undefined);
      }
    };

    const sendFrame = async (imageB64: string): Promise<FrameResult> => {
      controller = new AbortController();
      let timedOut = false;
      const timeout = setTimeout(() => {
        timedOut = true;
        controller?.abort();
      }, official ? OFFICIAL_TIMEOUT_MS : PREVIEW_TIMEOUT_MS);
      const pickedKit = purpose === 'checkout' && target.is_kit && target.qrText === undefined;
      const request = {
        qrText: target.qrText,
        kitUnitId: pickedKit ? target.item_unit_id : undefined,
        imageB64,
        purpose,
        reservationId: reservation?.id,
        persist: official,
      };
      try {
        return target.is_kit
          ? { kind: 'kit', result: await verifyKitFrameApi(request, controller.signal) }
          : { kind: 'single', result: await verifySingleFrameApi(request, controller.signal) };
      } catch (requestError) {
        if (timedOut) throw new ApiError('The scanner took too long to answer.', 503);
        throw requestError;
      } finally {
        clearTimeout(timeout);
        controller = null;
      }
    };

    const finishOfficial = (frame: FrameResult) => {
      setPhase('complete');
      const scanId = scanIdOf(frame);
      const usable = purpose === 'return' ? scanId !== null : frame.result.confirmable && scanId !== null;
      if (!usable) {
        setScanError(frameMessage(frame, purpose));
        return;
      }
      setConfirmation({
        qrText: target.qrText,
        unitId: target.item_unit_id,
        isKit: target.is_kit,
        ...(frame.kind === 'kit' ? { kitScanId: scanId ?? undefined } : { singleScanId: scanId ?? undefined }),
        returnFlag: frame.result.return_flag,
      });
    };

    const run = async () => {
      while (!cancelled) {
        const startedAt = Date.now();
        try {
          const frame = await sendFrame(await captureFrame());
          if (cancelled) return;
          setLatest(frame);
          setScanError(null);
          setModelUnavailable(false);
          if (official) {
            finishOfficial(frame);
            return;
          }
          const clean = frame.result.confirmable && foreignQrAt.current < startedAt;
          consecutive = clean ? consecutive + 1 : 0;
          setConsecutiveSuccesses(consecutive);
          if (consecutive >= SUCCESS_FRAMES_REQUIRED) {
            setConsecutiveSuccesses(0);
            setPhase('official');
            if (fullResolutionSize && fullResolutionSize !== pictureSize) {
              setCameraReady(false);
              setPictureSize(fullResolutionSize);
              setCameraKey((key) => key + 1);
            }
            return;
          }
        } catch (requestError) {
          if (cancelled) return;
          consecutive = 0;
          setConsecutiveSuccesses(0);
          setModelUnavailable(isModelUnavailable(requestError));
          setScanError(getErrorMessage(requestError, 'Could not check this frame.'));
          if (official) {
            setPhase('complete');
            return;
          }
        }
        await new Promise((resolve) => setTimeout(resolve, POLL_DELAY_MS));
      }
    };

    void run();
    return () => {
      cancelled = true;
      controller?.abort();
    };
  }, [
    appActive, busy, cameraError, cameraReady, fullResolutionSize, isFocused,
    phase, pictureSize, purpose, reservation?.id, target,
  ]);

  // After a flagged/failed return scan, or when the model is down, the student can
  // still hand the item back; the server records it as flagged for the admin.
  const returnWithoutScan = () => {
    if (!target) return;
    onConfirm({
      qrText: target.qrText,
      unitId: target.item_unit_id,
      isKit: target.is_kit,
      returnFlag: 'scan_unavailable',
    });
  };

  const resetScanner = () => {
    // A kit return goes straight back to counting; everything else back to the QR/list step.
    targetRef.current = initialTarget;
    setTarget(initialTarget);
    setConfirmation(null);
    setLatest(null);
    setConsecutiveSuccesses(0);
    setScanError(null);
    setModelUnavailable(false);
    setCameraError(null);
    setCameraReady(false);
    setPhase(initialTarget ? 'polling' : 'scanning');
    if (purpose === 'checkout' && mode === 'kit') void loadKits();
  };

  const switchMode = (next: ScanMode) => {
    if (busy || target !== null) return;
    setMode(next);
    setScanError(null);
    if (next === 'kit') void loadKits();
  };

  const retryCamera = () => {
    setCameraError(null);
    setCameraReady(false);
    setCameraKey((key) => key + 1);
  };

  const cameraVisible =
    permission?.granted === true
    && cameraError === null
    && isFocused
    && appActive
    && !busy
    && !kitPickerVisible
    && phase !== 'complete';
  const showPermissionFallback =
    permission?.granted !== true || permissionError !== null || cameraError !== null;

  const guideText = !target
    ? mode === 'kit' ? 'Center the QR code on the kit box' : 'Center the QR code sticker'
    : target.is_kit
      ? 'Frame the whole open kit'
      : 'Keep the item and its QR code in frame';

  const kitCounts = latest?.kind === 'kit' && latest.result.status !== 'unsure' ? (
    <Text style={styles.countText}>
      {latest.result.empty_count} empty · {latest.result.sensor_count} sensor
      {' · '}{latest.result.two_sensor_count} 2xsensor
    </Text>
  ) : null;
  const detected = latest?.kind === 'single' && latest.result.detected_item_class ? (
    <Text style={styles.countText}>Detected: {latest.result.detected_item_class}</Text>
  ) : null;
  const canReturnWithoutScan = purpose === 'return' && target !== null && modelUnavailable;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        {target ? `${target.item_name} · Unit ${target.item_unit_id}` : 'Scan the QR code'}
      </Text>
      <Text style={styles.description}>
        {target
          ? target.is_kit
            ? 'Open the kit and hold the camera over it until the counts are confirmed.'
            : 'Hold the item with its QR sticker visible until it is confirmed.'
          : kitPickerVisible
            ? 'Choose the kit box you are holding. Check that its unit number matches.'
            : mode === 'kit'
              ? 'Point the camera at the QR code on the kit box.'
              : 'Point the camera at the QR sticker on the item.'}
      </Text>

      {purpose === 'checkout' ? (
        <View style={styles.modeSwitch} accessibilityRole="tablist">
          {(['single', 'kit'] as const).map((value) => (
            <Pressable
              key={value}
              accessibilityRole="tab"
              accessibilityState={{ selected: mode === value }}
              disabled={busy || target !== null}
              onPress={() => switchMode(value)}
              style={[styles.modeButton, mode === value && styles.modeButtonSelected]}
            >
              <Text style={[styles.modeText, mode === value && styles.modeTextSelected]}>
                {value === 'single' ? 'Single item' : 'Kit'}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      {kitPickerVisible ? (
        <View style={styles.panel}>
          {kitsLoading ? (
            <View style={styles.loading}>
              <ActivityIndicator accessibilityLabel="Loading available kits" />
              <Text style={styles.description}>Loading available kits...</Text>
            </View>
          ) : null}
          {kitsError ? <InlineNotice message={kitsError} tone="error" /> : null}
          {!kitsLoading && !kitsError && kits.length === 0 ? (
            <InlineNotice message="No kits are available to borrow right now." tone="info" />
          ) : null}
          {kits.map((kit) => (
            <Pressable
              key={kit.unit_id}
              accessibilityRole="button"
              disabled={busy || kitsLoading}
              onPress={() => selectKit(kit)}
              style={styles.kitOption}
            >
              <Text style={styles.kitOptionTitle}>{kit.item_name} · Unit {kit.unit_id}</Text>
              <Text style={styles.description}>
                {kit.kit_type_name} · {kit.slot_count} slots · {kit.status}
              </Text>
            </Pressable>
          ))}
          <AppButton
            label="Refresh kits"
            onPress={() => void loadKits()}
            busy={kitsLoading}
            disabled={kitsLoading}
            variant="secondary"
          />
        </View>
      ) : null}

      {kitPickerVisible ? null : permission === null ? (
        <View style={styles.loading}>
          <ActivityIndicator accessibilityLabel="Checking camera permission" />
          <Text style={styles.description}>Checking camera permission...</Text>
        </View>
      ) : cameraVisible ? (
        <View style={styles.cameraFrame}>
          <CameraView
            key={cameraKey}
            ref={cameraRef}
            active={appActive && isFocused}
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            facing={Platform.OS === 'web' ? 'front' : 'back'}
            onBarcodeScanned={handleBarcodeScanned}
            onCameraReady={() => void handleCameraReady()}
            onMountError={({ message }) => {
              setCameraReady(false);
              setCameraError(message);
            }}
            pictureSize={pictureSize}
            style={styles.camera}
          >
            <View pointerEvents="none" style={styles.guideLayer}>
              <View style={styles.guideOutline} />
              <Text style={styles.guideText}>{guideText}</Text>
            </View>
          </CameraView>
          {!cameraReady || phase === 'resolving' ? (
            <View style={styles.cameraLoading}>
              <ActivityIndicator accessibilityLabel="Preparing camera" />
              <Text style={styles.loadingText}>
                {phase === 'resolving' ? 'Looking up QR code...' : 'Preparing camera...'}
              </Text>
            </View>
          ) : null}
        </View>
      ) : showPermissionFallback ? (
        <View style={styles.panel}>
          <InlineNotice
            message={
              permissionError
              || cameraError
              || (permission && !permission.granted && !permission.canAskAgain
                ? 'Allow camera access in your device settings, then retry.'
                : 'Camera permission is needed to scan QR codes.')
            }
            tone="error"
          />
          {permission?.granted ? (
            <AppButton label="Retry camera" onPress={retryCamera} variant="secondary" />
          ) : (
            <AppButton label="Allow camera" onPress={() => void requestCameraPermission()} variant="secondary" />
          )}
        </View>
      ) : null}

      {phase === 'polling' || phase === 'official' ? (
        <View style={styles.panel}>
          {latest ? (
            <InlineNotice
              message={phase === 'official' ? 'Looks good. Taking the final photo...' : frameMessage(latest, purpose)}
              tone={latest.result.confirmable ? 'success' : 'info'}
            />
          ) : (
            <InlineNotice message="Checking..." tone="info" />
          )}
          {kitCounts}
          {detected}
          <Text style={styles.progressText}>
            Clear frames: {consecutiveSuccesses} of {SUCCESS_FRAMES_REQUIRED}
          </Text>
          {scanError ? <InlineNotice message={scanError} tone="error" /> : null}
          {purpose === 'return' && phase === 'polling' && latest && !latest.result.confirmable ? (
            // A return must never get stuck: save this result and continue as flagged.
            <AppButton
              label="Finish scan anyway"
              onPress={() => setPhase('official')}
              disabled={busy}
              variant="secondary"
            />
          ) : null}
          {canReturnWithoutScan ? (
            <AppButton
              label="Return without scan (flagged)"
              onPress={returnWithoutScan}
              disabled={busy}
              variant="secondary"
            />
          ) : null}
          <AppButton label="Cancel" onPress={resetScanner} disabled={busy} variant="secondary" />
        </View>
      ) : null}

      {phase === 'complete' ? (
        <View style={styles.panel}>
          {confirmation ? (
            confirmation.returnFlag ? (
              <InlineNotice
                message={`This return will be flagged for the lab admin: ${RETURN_FLAG_LABELS[confirmation.returnFlag]}. Scan again, or return it anyway.`}
                tone="error"
              />
            ) : (
              <InlineNotice
                message={purpose === 'return' ? 'Scan confirmed. You can return it now.' : 'Scan confirmed. You can borrow it now.'}
                tone="success"
              />
            )
          ) : (
            <InlineNotice message={scanError || 'The scan did not pass. Scan again.'} tone="error" />
          )}
          {kitCounts}
          {detected}
          {error ? <InlineNotice message={error} tone="error" /> : null}
          {confirmation ? (
            <AppButton
              label={confirmation.returnFlag ? `${actionLabel} anyway` : actionLabel}
              onPress={() => onConfirm(confirmation)}
              busy={busy}
              disabled={busy}
            />
          ) : null}
          {canReturnWithoutScan && !confirmation ? (
            <AppButton
              label="Return without scan (flagged)"
              onPress={returnWithoutScan}
              disabled={busy}
              variant="secondary"
            />
          ) : null}
          <AppButton label="Scan again" onPress={resetScanner} disabled={busy} variant="secondary" />
        </View>
      ) : null}

      {scanError && phase === 'scanning' ? <InlineNotice message={scanError} tone="error" /> : null}
      {error && phase !== 'complete' ? <InlineNotice message={error} tone="error" /> : null}
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
    overflow: 'hidden',
    borderRadius: 8,
    backgroundColor: '#111',
  },
  guideLayer: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  guideOutline: {
    width: '84%',
    height: '72%',
    borderWidth: 2,
    borderColor: '#ffffff',
    borderRadius: 12,
  },
  guideText: {
    position: 'absolute',
    bottom: 12,
    paddingHorizontal: Spacing.two,
    paddingVertical: 6,
    borderRadius: 6,
    overflow: 'hidden',
    backgroundColor: '#00000099',
    color: '#ffffff',
    fontWeight: '600',
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
  panel: {
    gap: Spacing.two,
  },
  modeSwitch: {
    flexDirection: 'row',
    gap: Spacing.one,
    padding: 4,
    borderRadius: 10,
    backgroundColor: Colors.light.backgroundElement,
  },
  modeButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.two,
    borderRadius: 8,
  },
  modeButtonSelected: {
    backgroundColor: Colors.light.background,
  },
  modeText: {
    color: Colors.light.textSecondary,
    fontWeight: '600',
  },
  modeTextSelected: {
    color: Colors.light.text,
  },
  kitOption: {
    gap: 4,
    padding: Spacing.two,
    borderRadius: 8,
    backgroundColor: Colors.light.backgroundElement,
  },
  kitOptionTitle: {
    color: Colors.light.text,
    fontWeight: '600',
  },
  countText: {
    color: Colors.light.text,
    fontWeight: '600',
  },
  progressText: {
    color: Colors.light.textSecondary,
  },
});

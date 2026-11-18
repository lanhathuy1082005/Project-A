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
import { getErrorMessage } from '@/api/client';
import {
  type AvailableKit,
  type KitScanResult,
  type ScanConfirmation,
  type SingleScanResult,
  verifyKitFrameApi,
  verifySingleFrameApi,
} from '@/api/reservation.api';
import { AppButton } from '@/components/ui/AppButton';
import { InlineNotice } from '@/components/ui/InlineNotice';
import { Colors, Spacing } from '@/constants/theme';

interface QRScannerProps {
  actionLabel: string;
  busy: boolean;
  error: string | null;
  onConfirm: (confirmation: ScanConfirmation) => void;
  kitOptions?: AvailableKit[];
  kitOptionsLoading?: boolean;
  kitOptionsError?: string | null;
  onRefreshKitOptions?: () => void;
  allowIncompleteKit?: boolean;
  persistKitScans?: boolean;
  verifySingleItems?: boolean;
  persistSingleScans?: boolean;
}

type ScanMode = ScanConfirmation['mode'];
type ScannerPhase = 'scanning' | 'polling' | 'official' | 'complete';

interface ScanTarget {
  mode: ScanMode;
  unitId: number;
}

const SUCCESS_FRAMES_REQUIRED = 3;
const POLL_DELAY_MS = 400;
const FRAME_TIMEOUT_MS = 15000;

function parseQrCode(value: string): ScanTarget | null {
  const match = /^([ik]):([1-9]\d*)$/.exec(value.trim());
  if (!match) return null;

  const unitId = Number(match[2]);
  if (!Number.isSafeInteger(unitId) || unitId < 1) return null;
  return { mode: match[1] === 'k' ? 'kit' : 'single', unitId };
}

function parsePictureSize(value: string): { value: string; width: number; height: number } | null {
  const match = /^(\d+)x(\d+)$/.exec(value);
  if (!match) return null;
  return { value, width: Number(match[1]), height: Number(match[2]) };
}

function choosePreviewSize(sizes: string[]): string | null {
  const parsed = sizes
    .map(parsePictureSize)
    .filter((size) => size !== null);
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

function isKitResultConfirmable(
  result: KitScanResult,
  allowIncompleteKit: boolean,
): boolean {
  return result.status === 'success'
    || (allowIncompleteKit && result.status === 'missing');
}

function getKitResultMessage(
  result: KitScanResult,
  preparingOfficialScan: boolean,
  allowIncompleteKit: boolean,
): string {
  if (result.status === 'wrong') {
    return 'The detected category counts do not match the kit slots. Reframe and scan again.';
  }
  if (result.status === 'unsure') {
    return 'Tilt the box so its contents can be checked clearly.';
  }
  if (result.empty_count > 0 && !allowIncompleteKit) {
    return `${result.empty_count} slot(s) appear empty. Fill them, then scan again.`;
  }
  if (preparingOfficialScan) {
    return 'Counts look clear. Capturing a final image...';
  }
  return 'Counts are clear. Review them before confirming the borrow.';
}

function getKitResultTone(
  result: KitScanResult,
  allowIncompleteKit: boolean,
): 'error' | 'success' | 'info' {
  if (result.status === 'success') return 'success';
  if (
    result.status === 'wrong'
    || result.status === 'unsure'
    || (result.status === 'missing' && !allowIncompleteKit)
  ) {
    return 'error';
  }
  return 'info';
}

function getSingleResultMessage(
  result: SingleScanResult,
  preparingOfficialScan: boolean,
): string {
  if (result.status === 'wrong') {
    return `The QR is paired with ${result.detected_item_class}, which does not match the registered item type.`;
  }
  if (result.status === 'unsure') {
    return 'Keep one item and its QR code clearly in frame, then scan again.';
  }
  return preparingOfficialScan
    ? 'The QR and detected item match. Capturing the final scan...'
    : 'The QR and detected item match. Review before confirming.';
}

function getSingleResultTone(result: SingleScanResult): 'error' | 'success' | 'info' {
  if (result.status === 'success') return 'success';
  return result.status === 'wrong' ? 'error' : 'info';
}

export function QRScanner({
  actionLabel,
  busy,
  error,
  onConfirm,
  kitOptions,
  kitOptionsLoading = false,
  kitOptionsError = null,
  onRefreshKitOptions,
  allowIncompleteKit = false,
  persistKitScans = false,
  verifySingleItems = false,
  persistSingleScans = false,
}: QRScannerProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [mode, setMode] = useState<ScanMode>('single');
  const [target, setTarget] = useState<ScanTarget | null>(null);
  const [phase, setPhase] = useState<ScannerPhase>('scanning');
  const [cameraReady, setCameraReady] = useState(false);
  const [appActive, setAppActive] = useState(AppState.currentState === 'active');
  const [latestResult, setLatestResult] = useState<KitScanResult | null>(null);
  const [latestSingleResult, setLatestSingleResult] =
    useState<SingleScanResult | null>(null);
  const [consecutiveSuccesses, setConsecutiveSuccesses] = useState(0);
  const [confirmation, setConfirmation] = useState<ScanConfirmation | null>(null);
  const [pictureSize, setPictureSize] = useState<string | undefined>();
  const [fullResolutionSize, setFullResolutionSize] = useState<string | null>(null);
  const [cameraKey, setCameraKey] = useState(0);
  const cameraRef = useRef<CameraView>(null);
  const cameraSizesLoaded = useRef(false);
  const permissionRequested = useRef(false);
  const targetRef = useRef<ScanTarget | null>(null);
  const onConfirmRef = useRef(onConfirm);
  const isFocused = useIsFocused();

  useEffect(() => {
    onConfirmRef.current = onConfirm;
  }, [onConfirm]);

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
      !permission
      || permission.granted
      || !permission.canAskAgain
      || permissionRequested.current
    ) {
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
        const fullSize = sizes ? chooseFullResolutionSize(sizes) : null;
        setFullResolutionSize(fullSize);
        if (previewSize && previewSize !== pictureSize) {
          setCameraReady(false);
          setPictureSize(previewSize);
          setCameraKey((key) => key + 1);
          return;
        }
      } catch (sizeError) {
        setCameraError(
          getErrorMessage(sizeError, 'Could not configure camera resolution.'),
        );
        setCameraReady(false);
        return;
      }
    }
    setCameraReady(true);
  }, [pictureSize]);

  const handleBarcodeScanned = useCallback(
    ({ data }: BarcodeScanningResult) => {
      if (targetRef.current) return;
      const nextTarget = parseQrCode(data);
      if (!nextTarget) {
        setScanError('Invalid QR code. Expected a QR payload such as i:42 or k:50.');
        return;
      }
      if (nextTarget.mode !== mode) {
        setScanError(
          mode === 'kit'
            ? 'Kit mode is selected. Scan the kit box QR code (k:<id>).'
            : 'Single mode is selected. Scan an item QR code (i:<id>).',
        );
        return;
      }

      targetRef.current = nextTarget;
      setTarget(nextTarget);
      setScanError(null);
      setLatestResult(null);
      setLatestSingleResult(null);
      setConsecutiveSuccesses(0);
      if (nextTarget.mode === 'single' && !verifySingleItems) {
        setConfirmation({ unitId: nextTarget.unitId, mode: 'single' });
        setPhase('complete');
      } else {
        setPhase('polling');
      }
    },
    [mode, verifySingleItems],
  );

  const selectKit = (kit: AvailableKit) => {
    const nextTarget = { mode: 'kit' as const, unitId: kit.unit_id };
    targetRef.current = nextTarget;
    setTarget(nextTarget);
    setScanError(null);
    setLatestResult(null);
    setLatestSingleResult(null);
    setConsecutiveSuccesses(0);
    setPhase('polling');
  };

  useEffect(() => {
    if (
      phase !== 'polling'
      && phase !== 'official'
    ) {
      return;
    }
    if (
      !target
      || target.mode !== 'kit'
      || !cameraReady
      || !isFocused
      || !appActive
      || busy
      || cameraError
    ) {
      return;
    }

    let cancelled = false;
    let requestController: AbortController | null = null;
    let consecutive = 0;
    const capturePhase = phase;

    const run = async () => {
      while (!cancelled) {
        let picture: CameraCapturedPicture | null = null;
        try {
          const camera = cameraRef.current;
          if (!camera) return;
          picture = await camera.takePictureAsync({
            quality: capturePhase === 'official' ? 0.9 : 0.25,
            base64: true,
            exif: false,
            shutterSound: false,
          });
          if (!picture.base64) {
            throw new Error('Camera did not provide image data.');
          }
          const imageB64 = picture.base64;
          await removeTemporaryCapture(picture);
          picture = null;

          requestController = new AbortController();
          let timedOut = false;
          const timeout = setTimeout(() => {
            timedOut = true;
            requestController?.abort();
          }, FRAME_TIMEOUT_MS);
          let result: KitScanResult;
          try {
            result = await verifyKitFrameApi(
              target.unitId,
              imageB64,
              requestController.signal,
              persistKitScans && capturePhase === 'official',
            );
          } catch (requestError) {
            if (timedOut) throw new Error('Kit verification timed out.');
            throw requestError;
          } finally {
            clearTimeout(timeout);
            requestController = null;
          }
          if (cancelled) return;

          setLatestResult(result);
          setScanError(null);
          if (capturePhase === 'official') {
            setPhase('complete');
            if (
              isKitResultConfirmable(result, allowIncompleteKit)
              && (!persistKitScans || result.kit_scan_id !== null)
            ) {
              const nextConfirmation: ScanConfirmation = {
                unitId: target.unitId,
                mode: 'kit',
              };
              if (persistKitScans) {
                nextConfirmation.kitScanId = result.kit_scan_id ?? undefined;
              } else {
                nextConfirmation.imageB64 = imageB64;
              }
              setConfirmation(nextConfirmation);
            } else {
              setScanError(
                isKitResultConfirmable(result, allowIncompleteKit)
                  ? 'The final kit scan was not saved. Scan the kit again.'
                  : getKitResultMessage(result, false, allowIncompleteKit),
              );
            }
            return;
          }

          consecutive = isKitResultConfirmable(result, allowIncompleteKit)
            ? consecutive + 1
            : 0;
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
          await new Promise((resolve) => setTimeout(resolve, POLL_DELAY_MS));
        } catch (requestError) {
          if (picture) {
            try {
              await removeTemporaryCapture(picture);
            } catch (cleanupError) {
              setCameraError(
                getErrorMessage(cleanupError, 'Could not remove a temporary camera image.'),
              );
            }
          }
          if (cancelled) return;
          consecutive = 0;
          setConsecutiveSuccesses(0);
          setScanError(
            getErrorMessage(requestError, 'Could not verify the kit frame.'),
          );
          if (capturePhase === 'official') {
            setPhase('complete');
            return;
          }
          await new Promise((resolve) => setTimeout(resolve, POLL_DELAY_MS));
        }
      }
    };

    void run();
    return () => {
      cancelled = true;
      requestController?.abort();
    };
  }, [
    appActive,
    busy,
    cameraError,
    cameraReady,
    fullResolutionSize,
    allowIncompleteKit,
    isFocused,
    persistKitScans,
    phase,
    pictureSize,
    target,
  ]);

  useEffect(() => {
    if (phase !== 'polling' && phase !== 'official') return;
    if (
      !verifySingleItems
      || !target
      || target.mode !== 'single'
      || !cameraReady
      || !isFocused
      || !appActive
      || busy
      || cameraError
    ) {
      return;
    }

    let cancelled = false;
    let requestController: AbortController | null = null;
    let consecutive = 0;
    const capturePhase = phase;

    const run = async () => {
      while (!cancelled) {
        let picture: CameraCapturedPicture | null = null;
        try {
          const camera = cameraRef.current;
          if (!camera) return;
          picture = await camera.takePictureAsync({
            quality: capturePhase === 'official' ? 0.9 : 0.25,
            base64: true,
            exif: false,
            shutterSound: false,
          });
          if (!picture.base64) {
            throw new Error('Camera did not provide image data.');
          }
          const imageB64 = picture.base64;
          await removeTemporaryCapture(picture);
          picture = null;

          requestController = new AbortController();
          let timedOut = false;
          const timeout = setTimeout(() => {
            timedOut = true;
            requestController?.abort();
          }, FRAME_TIMEOUT_MS);
          let result: SingleScanResult;
          try {
            result = await verifySingleFrameApi(
              target.unitId,
              imageB64,
              requestController.signal,
              persistSingleScans && capturePhase === 'official',
            );
          } catch (requestError) {
            if (timedOut) throw new Error('Single-item verification timed out.');
            throw requestError;
          } finally {
            clearTimeout(timeout);
            requestController = null;
          }
          if (cancelled) return;

          setLatestSingleResult(result);
          setScanError(null);
          if (capturePhase === 'official') {
            setPhase('complete');
            if (result.status === 'success' && result.single_scan_id !== null) {
              setConfirmation({
                unitId: target.unitId,
                mode: 'single',
                singleScanId: result.single_scan_id,
              });
            } else {
              setScanError(
                result.status === 'success'
                  ? 'The final item scan was not saved. Scan the item again.'
                  : getSingleResultMessage(result, false),
              );
            }
            return;
          }

          consecutive = result.status === 'success' ? consecutive + 1 : 0;
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
          await new Promise((resolve) => setTimeout(resolve, POLL_DELAY_MS));
        } catch (requestError) {
          if (picture) {
            try {
              await removeTemporaryCapture(picture);
            } catch (cleanupError) {
              setCameraError(
                getErrorMessage(cleanupError, 'Could not remove a temporary camera image.'),
              );
            }
          }
          if (cancelled) return;
          consecutive = 0;
          setConsecutiveSuccesses(0);
          setScanError(
            getErrorMessage(requestError, 'Could not verify the single item.'),
          );
          if (capturePhase === 'official') {
            setPhase('complete');
            return;
          }
          await new Promise((resolve) => setTimeout(resolve, POLL_DELAY_MS));
        }
      }
    };

    void run();
    return () => {
      cancelled = true;
      requestController?.abort();
    };
  }, [
    appActive,
    busy,
    cameraError,
    cameraReady,
    fullResolutionSize,
    isFocused,
    persistSingleScans,
    phase,
    pictureSize,
    target,
    verifySingleItems,
  ]);

  const resetScanner = () => {
    targetRef.current = null;
    setTarget(null);
    setConfirmation(null);
    setLatestResult(null);
    setLatestSingleResult(null);
    setConsecutiveSuccesses(0);
    setScanError(null);
    setCameraError(null);
    setCameraReady(false);
    setPhase('scanning');
  };

  const switchMode = (nextMode: ScanMode) => {
    if (busy || target !== null) return;
    setMode(nextMode);
    setScanError(null);
    setLatestResult(null);
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
    && !(kitOptions !== undefined && mode === 'kit' && target === null)
    && phase !== 'complete';
  const kitSelectionVisible =
    kitOptions !== undefined
    && mode === 'kit'
    && target === null;
  const showPermissionFallback =
    permission?.granted !== true || permissionError !== null || cameraError !== null;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Scan an item or kit</Text>
      <Text style={styles.description}>
        {kitOptions !== undefined
          ? 'Choose a kit, scan its contents, review the counts, then confirm the borrow.'
          : 'Choose a mode, then scan an item or kit to continue.'}
      </Text>

      <View style={styles.modeSwitch} accessibilityRole="tablist">
        <Pressable
          accessibilityRole="tab"
          accessibilityState={{ selected: mode === 'single' }}
          disabled={busy || target !== null}
          onPress={() => switchMode('single')}
          style={[styles.modeButton, mode === 'single' && styles.modeButtonSelected]}
        >
          <Text style={[styles.modeText, mode === 'single' && styles.modeTextSelected]}>
            Single item
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="tab"
          accessibilityState={{ selected: mode === 'kit' }}
          disabled={busy || target !== null}
          onPress={() => switchMode('kit')}
          style={[styles.modeButton, mode === 'kit' && styles.modeButtonSelected]}
        >
          <Text style={[styles.modeText, mode === 'kit' && styles.modeTextSelected]}>
            Kit
          </Text>
        </Pressable>
      </View>

      {kitSelectionVisible ? (
        <View style={styles.kitPicker}>
          <Text style={styles.description}>Choose an available kit to borrow.</Text>
          {kitOptionsLoading ? (
            <View style={styles.loading}>
              <ActivityIndicator accessibilityLabel="Loading available kits" />
              <Text style={styles.description}>Loading available kits...</Text>
            </View>
          ) : null}
          {kitOptionsError ? (
            <InlineNotice message={kitOptionsError} tone="error" />
          ) : null}
          {!kitOptionsLoading && !kitOptionsError && kitOptions?.length === 0 ? (
            <InlineNotice message="No kits are currently available to borrow." tone="info" />
          ) : null}
          {kitOptions?.map((kit) => (
            <Pressable
              key={kit.unit_id}
              accessibilityRole="button"
              disabled={busy || kitOptionsLoading}
              onPress={() => selectKit(kit)}
              style={styles.kitOption}
            >
              <Text style={styles.kitOptionTitle}>
                {kit.item_name} · Unit {kit.unit_id}
              </Text>
              <Text style={styles.description}>
                {kit.kit_type_name} · {kit.slot_count} slots · {kit.status}
              </Text>
            </Pressable>
          ))}
          {onRefreshKitOptions ? (
            <AppButton
              label="Refresh kits"
              onPress={onRefreshKitOptions}
              busy={kitOptionsLoading}
              disabled={kitOptionsLoading}
              variant="secondary"
            />
          ) : null}
        </View>
      ) : permission === null ? (
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
            onBarcodeScanned={
              target === null && !(mode === 'kit' && kitOptions !== undefined)
                ? handleBarcodeScanned
                : undefined
            }
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
              <Text style={styles.guideText}>
                {target?.mode === 'kit'
                  ? 'Frame the whole open kit'
                  : mode === 'kit'
                    ? 'Center the kit box QR code'
                    : 'Center the item QR code'}
              </Text>
            </View>
          </CameraView>
          {!cameraReady ? (
            <View style={styles.cameraLoading}>
              <ActivityIndicator accessibilityLabel="Preparing camera" />
              <Text style={styles.loadingText}>Preparing camera...</Text>
            </View>
          ) : null}
        </View>
      ) : showPermissionFallback ? (
        <View style={styles.permissionMessage}>
          <InlineNotice
            message={
              permissionError
              || cameraError
              || (permission && !permission.granted && !permission.canAskAgain
                ? 'Allow camera access in your device settings, then retry.'
                : 'Camera permission is needed to scan item and kit QR codes.')
            }
            tone="error"
          />
          {permission?.granted ? (
            <AppButton label="Retry camera" onPress={retryCamera} variant="secondary" />
          ) : (
            <AppButton
              label="Allow camera"
              onPress={() => void requestCameraPermission()}
              variant="secondary"
            />
          )}
        </View>
      ) : phase === 'complete' ? (
        <View style={styles.resultPanel}>
          {confirmation ? (
            <InlineNotice
              message={
                confirmation.mode === 'kit'
                  ? `Kit ${confirmation.unitId} scan is ready. Review the counts and confirm borrowing.`
                  : verifySingleItems
                    ? `Item ${confirmation.unitId} QR and model detection match. Review and confirm borrowing.`
                    : `Item ${confirmation.unitId} QR code scanned.`
              }
              tone="success"
            />
          ) : (
            <InlineNotice
              message={scanError || 'Scan did not pass. Adjust the kit and scan again.'}
              tone="error"
            />
          )}
          {latestResult && latestResult.status !== 'unsure' ? (
            <Text style={styles.countText}>
              {latestResult.empty_count} empty
              {' · '}
              {latestResult.sensor_count} sensor
              {' · '}
              {latestResult.two_sensor_count} 2xsensor
            </Text>
          ) : null}
          {latestSingleResult?.detected_item_class ? (
            <Text style={styles.countText}>
              Detected: {latestSingleResult.detected_item_class}
            </Text>
          ) : null}
          {error ? <InlineNotice message={error} tone="error" /> : null}
          {confirmation ? (
            <AppButton
              label={actionLabel}
              onPress={() => onConfirmRef.current(confirmation)}
              busy={busy}
              disabled={busy}
            />
          ) : null}
          <AppButton
            label="Scan again"
            onPress={resetScanner}
            disabled={busy}
            variant="secondary"
          />
        </View>
      ) : null}

      {target && phase === 'polling' ? (
        target.mode === 'kit' ? (
          <View style={styles.resultPanel}>
            {latestResult ? (
              <InlineNotice
                message={getKitResultMessage(
                  latestResult,
                  false,
                  allowIncompleteKit,
                )}
                tone={getKitResultTone(latestResult, allowIncompleteKit)}
              />
            ) : (
              <InlineNotice message="Checking kit contents..." tone="info" />
            )}
            {latestResult && latestResult.status !== 'unsure' ? (
              <Text style={styles.countText}>
                {latestResult.empty_count} empty
                {' · '}
                {latestResult.sensor_count} sensor
                {' · '}
                {latestResult.two_sensor_count} 2xsensor
              </Text>
            ) : null}
            <Text style={styles.progressText}>
              Clear frames: {consecutiveSuccesses} of {SUCCESS_FRAMES_REQUIRED}
            </Text>
            {scanError ? <InlineNotice message={scanError} tone="error" /> : null}
            {error ? <InlineNotice message={error} tone="error" /> : null}
          </View>
        ) : verifySingleItems ? (
          <View style={styles.resultPanel}>
            {latestSingleResult ? (
              <InlineNotice
                message={getSingleResultMessage(latestSingleResult, false)}
                tone={getSingleResultTone(latestSingleResult)}
              />
            ) : (
              <InlineNotice
                message="Checking the QR and detected item..."
                tone="info"
              />
            )}
            {latestSingleResult?.detected_item_class ? (
              <Text style={styles.countText}>
                Detected: {latestSingleResult.detected_item_class}
              </Text>
            ) : null}
            <Text style={styles.progressText}>
              Matching frames: {consecutiveSuccesses} of {SUCCESS_FRAMES_REQUIRED}
            </Text>
            {scanError ? <InlineNotice message={scanError} tone="error" /> : null}
            {error ? <InlineNotice message={error} tone="error" /> : null}
          </View>
        ) : null
      ) : null}

      {scanError && phase === 'scanning' ? (
        <InlineNotice message={scanError} tone="error" />
      ) : null}
      {error && phase !== 'polling' && phase !== 'complete' ? (
        <InlineNotice message={error} tone="error" />
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
  kitPicker: {
    gap: Spacing.two,
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
  permissionMessage: {
    gap: Spacing.two,
  },
  resultPanel: {
    gap: Spacing.two,
  },
  countText: {
    color: Colors.light.text,
    fontWeight: '600',
  },
  progressText: {
    color: Colors.light.textSecondary,
  },
});

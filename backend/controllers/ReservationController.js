import { makeReservation, returnItem,
         getMyReservations, getAdminReservations,
         verifyKitFrame, verifySingleFrame,
         getAvailableKits, resolveUnit }                from '../services/ReservationService.js';
import { scanLog }                                    from '../utils/scanLog.js';

export const handleBorrow = async (req, res, next) => {
  try {
    const { qr_text, kit_unit_id, kit_scan_id, single_scan_id } = req.body ?? {};
    const reservation = await makeReservation(
      { qr_text, kit_unit_id, kit_scan_id, single_scan_id },
      req.session.user.id,
    );
    return res.status(201).json({ message: 'Item borrowed successfully', data: reservation });
  } catch (err) { next(err); }
};

export const handleReturn = async (req, res, next) => {
  try {
    const { qr_text, kit_scan_id, single_scan_id } = req.body ?? {};
    const result = await returnItem(
      { reservation_id: req.params.id, qr_text, kit_scan_id, single_scan_id },
      req.session.user.id,
    );
    return res.status(200).json({
      message: result.return_flag
        ? 'Item returned and flagged for admin review'
        : 'Item returned successfully',
      data: result,
    });
  } catch (err) { next(err); }
};

export const handleGetMyReservations = async (req, res, next) => {
  try {
    const result = await getMyReservations(req.session.user.id, req.pagination);
    return res.status(200).json(result);
  } catch (err) { next(err); }
};

export const handleGetAllReservations = async (req, res, next) => {
  try {
    const result = await getAdminReservations(req.pagination);
    return res.status(200).json(result);
  } catch (err) { next(err); }
};

// Logs each scan frame request and how it ended (SCAN_DEBUG=true).
const scanFrameHandler = (kind, verify) => async (req, res, next) => {
  const body = req.body ?? {};
  const started = Date.now();
  const request = {
    user: req.session.user.id,
    purpose: body.purpose ?? 'checkout',
    qr: typeof body.qr_text === 'string' ? body.qr_text : undefined,
    kit_unit: body.kit_unit_id,
    reservation: body.reservation_id,
    official: body.persist_scan === true,
    image_kb: typeof body.image_b64 === 'string' ? Math.round((body.image_b64.length * 3) / 4 / 1024) : 0,
  };
  scanLog(`${kind}.request`, request);
  try {
    const result = await verify(body, req.session.user.id);
    scanLog(`${kind}.result`, {
      unit: result.item_unit_id,
      status: result.status,
      confirmable: result.confirmable,
      ...(kind === 'kit'
        ? { empty: result.empty_count, sensor: result.sensor_count, two: result.two_sensor_count,
            confidence: result.confidence, scan_id: result.kit_scan_id }
        : { detected: result.detected_item_class, item_conf: result.item_confidence,
            qr_conf: result.qr_confidence, scan_id: result.single_scan_id }),
      return_flag: result.return_flag,
      total_ms: Date.now() - started,
    });
    return res.json({ data: result });
  } catch (err) {
    scanLog(`${kind}.error`, { http: err.statusCode ?? 500, message: err.message, total_ms: Date.now() - started });
    next(err);
  }
};

export const handleVerifyKitFrame = scanFrameHandler('kit', verifyKitFrame);
export const handleVerifySingleFrame = scanFrameHandler('single', verifySingleFrame);

export const handleGetAvailableKits = async (req, res, next) => {
  try {
    const { kits, kit_qr_required } = await getAvailableKits();
    return res.json({ data: kits, kit_qr_required });
  } catch (err) { next(err); }
};

export const handleResolveUnit = async (req, res, next) => {
  try {
    const unit = await resolveUnit(req.body ?? {});
    return res.json({ data: unit });
  } catch (err) { next(err); }
};

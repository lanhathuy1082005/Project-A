import { makeReservation, returnItem,
         getMyReservations, getAdminReservations,
         verifyKitFrame, verifySingleFrame,
         getAvailableKits, resolveUnit }                from '../services/ReservationService.js';

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

export const handleVerifyKitFrame = async (req, res, next) => {
  try {
    const result = await verifyKitFrame(req.body ?? {}, req.session.user.id);
    return res.json({ data: result });
  } catch (err) { next(err); }
};

export const handleVerifySingleFrame = async (req, res, next) => {
  try {
    const result = await verifySingleFrame(req.body ?? {}, req.session.user.id);
    return res.json({ data: result });
  } catch (err) { next(err); }
};

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

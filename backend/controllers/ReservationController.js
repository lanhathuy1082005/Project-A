import { ReturnRequest }     from '../dto/ReservationDTO.js';
import { makeReservation, returnItem,
         getMyReservations, getAdminReservations,
         verifyKitFrame, verifySingleFrame,
         getAvailableKits }                              from '../services/ReservationService.js';

export const handleBorrow = async (req, res, next) => {
  try {
    const { scanned_item_unit_id, kit_scan_id, single_scan_id } = req.body;
    const reservation = await makeReservation(
      scanned_item_unit_id,
      req.session.user.id,
      kit_scan_id,
      single_scan_id,
    );
    return res.status(201).json({ message: 'Item borrowed successfully', data: reservation });
  } catch (err) { next(err); }
};

export const handleReturn = async (req, res, next) => {
  try {
    const dto = new ReturnRequest({ ...req.body, id: req.params.id });
    dto.validate();
    const result = await returnItem(dto, req.session.user.id);
    return res.status(200).json({ message: 'Item returned successfully', data: result });
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
    const result = await verifyKitFrame(req.body, req.session.user.id);
    return res.json({ data: result });
  } catch (err) { next(err); }
};

export const handleVerifySingleFrame = async (req, res, next) => {
  try {
    const result = await verifySingleFrame(req.body, req.session.user.id);
    return res.json({ data: result });
  } catch (err) { next(err); }
};

export const handleGetAvailableKits = async (req, res, next) => {
  try {
    const kits = await getAvailableKits();
    return res.json({ data: kits });
  } catch (err) { next(err); }
};
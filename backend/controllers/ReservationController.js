import { ReturnRequest }     from '../dto/ReservationDTO.js';
import { makeReservation, returnItem,
         getMyReservations, getAdminReservations}       from '../services/ReservationService.js';

export const handleBorrow = async (req, res, next) => {
  try {
    const {scanned_item_unit_id} = req.body;
    console.log('Scanned item unit ID:', scanned_item_unit_id); // Debug log
    const reservation = await makeReservation(scanned_item_unit_id, req.session.user.id);
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
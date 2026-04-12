import { getTodaySessions, getAllClasses, getClassStudents,
         createClass, updateClass, deleteClass }       from '../models/Timetable.js';
import { getAllItems, addItem, updateItem, deleteItem,
         getAllItemUnits, addItemUnit, updateItemUnit, deleteItemUnit,
         getInventoryStats, getLabChecklist }           from '../models/Item.js';
import { getAllReservations, getReservationById,
         getPendingReturns, markApproved, markMaintenance,
         getReservationLogs, getDashboardStats }        from '../models/Reservation.js';
import { getAllLabs }                                    from '../models/Lab.js';
import { getAllCourses }                                 from '../models/Course.js';
import { getAllFeedback }                                from '../models/Feedback.js';
import { AppError }                                      from '../utils/AppError.js';

// ── Dashboard ─────────────────────────────────────────────────────────────────
export const handleDashboard = async (req, res, next) => {
  try {
    const [reservationStats, inventoryStats, todaySessions] = await Promise.all([
      getDashboardStats(),
      getInventoryStats(),
      getTodaySessions(),
    ]);
    return res.json({
      active_borrows:    parseInt(reservationStats.active_borrows),
      pending_returns:   parseInt(reservationStats.pending_returns),
      borrowed_devices:  parseInt(inventoryStats.borrowed_count),
      maintenance_devices: parseInt(inventoryStats.maintenance_count),
      available_devices: parseInt(inventoryStats.available_count),
      today_sessions:    todaySessions,
    });
  } catch (err) { next(err); }
};

// ── Class Management ──────────────────────────────────────────────────────────
export const handleGetClasses = async (req, res, next) => {
  try {
    const result = await getAllClasses(req.pagination);
    return res.json(result);
  } catch (err) { next(err); }
};

export const handleGetClassStudents = async (req, res, next) => {
  try {
    const students = await getClassStudents(parseInt(req.params.id));
    return res.json({ data: students });
  } catch (err) { next(err); }
};

export const handleCreateClass = async (req, res, next) => {
  try {
    const { course_id, day_of_week, start_time, end_time } = req.body;
    if (!course_id || day_of_week == null || !start_time || !end_time)
      throw new AppError('course_id, day_of_week, start_time, end_time are required', 400);
    const result = await createClass(course_id, day_of_week, start_time, end_time);
    return res.status(201).json({ message: 'Class created', data: result });
  } catch (err) { next(err); }
};

export const handleUpdateClass = async (req, res, next) => {
  try {
    const { course_id, day_of_week, start_time, end_time } = req.body;
    const result = await updateClass(parseInt(req.params.id), course_id, day_of_week, start_time, end_time);
    if (!result) throw new AppError('Class not found', 404);
    return res.json({ message: 'Class updated', data: result });
  } catch (err) { next(err); }
};

export const handleDeleteClass = async (req, res, next) => {
  try {
    const result = await deleteClass(parseInt(req.params.id));
    if (!result) throw new AppError('Class not found', 404);
    return res.json({ message: 'Class deleted' });
  } catch (err) { next(err); }
};

// ── Inventory (Items + Item Units) ────────────────────────────────────────────
export const handleGetItems = async (req, res, next) => {
  try {
    const items = await getAllItems();
    return res.json({ data: items });
  } catch (err) { next(err); }
};

export const handleAddItem = async (req, res, next) => {
  try {
    const { name } = req.body;
    if (!name) throw new AppError('name is required', 400);
    const item = await addItem(name);
    return res.status(201).json({ message: 'Item created', data: item });
  } catch (err) { next(err); }
};

export const handleUpdateItem = async (req, res, next) => {
  try {
    const { name } = req.body;
    const item = await updateItem(parseInt(req.params.id), name);
    if (!item) throw new AppError('Item not found', 404);
    return res.json({ message: 'Item updated', data: item });
  } catch (err) { next(err); }
};

export const handleDeleteItem = async (req, res, next) => {
  try {
    const item = await deleteItem(parseInt(req.params.id));
    if (!item) throw new AppError('Item not found', 404);
    return res.json({ message: 'Item deleted' });
  } catch (err) { next(err); }
};

export const handleGetItemUnits = async (req, res, next) => {
  try {
    const status = req.query.status || null;
    const result = await getAllItemUnits({ ...req.pagination, status });
    return res.json(result);
  } catch (err) { next(err); }
};

export const handleAddItemUnit = async (req, res, next) => {
  try {
    const { item_id, lab_id } = req.body;
    if (!item_id) throw new AppError('item_id is required', 400);
    const unit = await addItemUnit(item_id, lab_id);
    return res.status(201).json({ message: 'Item unit created', data: unit });
  } catch (err) { next(err); }
};

export const handleUpdateItemUnit = async (req, res, next) => {
  try {
    const { lab_id, status } = req.body;
    const unit = await updateItemUnit(parseInt(req.params.id), lab_id, status);
    if (!unit) throw new AppError('Item unit not found', 404);
    return res.json({ message: 'Item unit updated', data: unit });
  } catch (err) { next(err); }
};

export const handleDeleteItemUnit = async (req, res, next) => {
  try {
    const unit = await deleteItemUnit(parseInt(req.params.id));
    if (!unit) throw new AppError('Item unit not found', 404);
    return res.json({ message: 'Item unit deleted' });
  } catch (err) { next(err); }
};

// ── Borrow & Return Management ────────────────────────────────────────────────
export const handleGetAllReservations = async (req, res, next) => {
  try {
    const { status, user_id, class_id, date_from, date_to } = req.query;
    const result = await getAllReservations({
      ...req.pagination,
      status:   status    || null,
      userId:   user_id   || null,
      classId:  class_id  ? parseInt(class_id) : null,
      dateFrom: date_from || null,
      dateTo:   date_to   || null,
    });
    return res.json(result);
  } catch (err) { next(err); }
};

export const handleGetReservationDetail = async (req, res, next) => {
  try {
    const reservation = await getReservationById(parseInt(req.params.id));
    if (!reservation) throw new AppError('Reservation not found', 404);
    return res.json({ data: reservation });
  } catch (err) { next(err); }
};

// ── Verification Panel ────────────────────────────────────────────────────────
export const handleGetPendingReturns = async (req, res, next) => {
  try {
    const result = await getPendingReturns(req.pagination);
    return res.json(result);
  } catch (err) { next(err); }
};

export const handleVerifyReturn = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const result = await markApproved(id);
    if (!result) throw new AppError('Reservation not found or already processed', 400);
    // Update item_unit status back to Available
    const reservation = await getReservationById(id);
    if (reservation) {
      await updateItemUnit(reservation.item_unit_id, null, 'Available');
    }
    return res.json({ message: 'Return verified', data: result });
  } catch (err) { next(err); }
};

export const handleReportIssue = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const result = await markMaintenance(id);
    if (!result) throw new AppError('Reservation not found or already processed', 400);
    // Update item_unit status to Maintenance
    const reservation = await getReservationById(id);
    if (reservation) {
      await updateItemUnit(reservation.item_unit_id, null, 'Broken');
    }
    return res.json({ message: 'Issue reported, item marked as Broken', data: result });
  } catch (err) { next(err); }
};

// ── Logs ──────────────────────────────────────────────────────────────────────
export const handleGetLogs = async (req, res, next) => {
  try {
    const { user_id, class_id, date_from, date_to } = req.query;
    const result = await getReservationLogs({
      ...req.pagination,
      userId: user_id || null,
      classId: class_id ? parseInt(class_id) : null,
      dateFrom: date_from || null,
      dateTo: date_to || null,
    });
    return res.json(result);
  } catch (err) { next(err); }
};

// ── Labs & Courses (lookups) ──────────────────────────────────────────────────
export const handleGetLabs = async (req, res, next) => {
  try {
    const labs = await getAllLabs();
    return res.json({ data: labs });
  } catch (err) { next(err); }
};

export const handleGetCourses = async (req, res, next) => {
  try {
    const courses = await getAllCourses();
    return res.json({ data: courses });
  } catch (err) { next(err); }
};

// ── Lab Checklist (periodic maintenance/audit) ────────────────────────────────
export const handleGetLabChecklist = async (req, res, next) => {
  try {
    const labId = parseInt(req.params.labId);
    if (!labId) throw new AppError('lab_id is required', 400);
    const items = await getLabChecklist(labId);
    return res.json({ data: items });
  } catch (err) { next(err); }
};

// ── Feedback (admin view) ─────────────────────────────────────────────────────
export const handleGetFeedback = async (req, res, next) => {
  try {
    const result = await getAllFeedback(req.pagination);
    return res.json(result);
  } catch (err) { next(err); }
};

import express from 'express';
import { requireRoles, paginate } from '../middleware/auth.js';
import {
  handleDashboard,
  handleGetClasses, handleGetClassStudents,
  handleCreateClass, handleUpdateClass, handleDeleteClass,
  handleGetItems, handleAddItem, handleUpdateItem, handleDeleteItem,
  handleGetItemUnits, handleAddItemUnit, handleUpdateItemUnit, handleDeleteItemUnit,
  handleGetAllReservations, handleGetReservationDetail,
  handleGetPendingReturns, handleVerifyReturn, handleReportIssue,
  handleGetLogs,
  handleGetLabs, handleGetCourses,
  handleGetLabChecklist,
  handleGetFeedback,
} from '../controllers/AdminController.js';

const router = express.Router();
const admin = requireRoles('admin');

// Dashboard
router.get('/dashboard', admin, handleDashboard);

// Class Management
router.get('/classes',           admin, paginate, handleGetClasses);
router.get('/classes/:id/students', admin,        handleGetClassStudents);
router.post('/classes',          admin,           handleCreateClass);
router.patch('/classes/:id',     admin,           handleUpdateClass);
router.delete('/classes/:id',    admin,           handleDeleteClass);

// Inventory — Items (types)
router.get('/items',             admin,           handleGetItems);
router.post('/items',            admin,           handleAddItem);
router.patch('/items/:id',       admin,           handleUpdateItem);
router.delete('/items/:id',      admin,           handleDeleteItem);

// Inventory — Item Units (individual devices)
router.get('/item-units',        admin, paginate, handleGetItemUnits);
router.post('/item-units',       admin,           handleAddItemUnit);
router.patch('/item-units/:id',  admin,           handleUpdateItemUnit);
router.delete('/item-units/:id', admin,           handleDeleteItemUnit);

// Borrow & Return Management
router.get('/reservations',           admin, paginate, handleGetAllReservations);
router.get('/reservations/:id',       admin,           handleGetReservationDetail);

// Verification Panel
router.get('/pending-returns',        admin, paginate, handleGetPendingReturns);
router.patch('/reservations/:id/verify',  admin,       handleVerifyReturn);
router.patch('/reservations/:id/report',  admin,       handleReportIssue);

// Logs
router.get('/logs',                   admin, paginate, handleGetLogs);

// Lookups
router.get('/labs',                   admin,           handleGetLabs);
router.get('/courses',                admin,           handleGetCourses);
router.get('/labs/:labId/checklist',  admin,           handleGetLabChecklist);

// Feedback
router.get('/feedback',               admin, paginate, handleGetFeedback);

export default router;

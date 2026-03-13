import express from "express";
import { requireRoles } from "../middleware/UserValidator.js";
import { handleGetAdminReservations,handleGetAvailableItemsForStudent,handleGetUserReservations,handleMakeReservation, handleReturnItem } from "../controllers/ReservationControllers.js";

const router = express.Router();

//reservation routes
router.post("/users/me/reservations", requireRoles("student"), handleMakeReservation);
router.get("/users/me/reservations", requireRoles("student"), handleGetUserReservations);
router.patch("/users/me/reservations", requireRoles("student"), handleReturnItem);
router.get("/reservations", requireRoles("admin"), handleGetAdminReservations);
router.get("/users/me/available-items", requireRoles("student"), handleGetAvailableItemsForStudent);

export default router;
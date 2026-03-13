import { getAvailableItemsForStudent, getAdminReservations, getUserReservations, makeReservation, returnItem } from "../services/ReservationServices.js";

export const handleMakeReservation = async (req, res) => {
    const { item_unit_id, timetable_id, scanned_item_unit_id } = req.body;
    const user_id = req.session.user.id;
    try {
        const reservation = await makeReservation(item_unit_id, user_id, timetable_id, scanned_item_unit_id);
        return res.status(201).json(reservation);
    } catch (error) {
        if (error.message === "Scanned item unit ID does not match expected item unit ID") {
            return res.status(400).json({ message: error.message });
        }
        return res.status(500).json({ message: "Server error" });
    }
}

export const handleGetUserReservations = async (req, res) => {
    const user_id = req.session.user.id;
    try {
        const reservations = await getUserReservations(user_id);
        return res.status(200).json(reservations);
    } catch (error) {
        return res.status(500).json({ message: "Server error" });
    }
}

export const handleGetAdminReservations = async (req, res) => {
    try {
        const reservations = await getAdminReservations();
        return res.status(200).json(reservations);
    } catch (error) {
        return res.status(500).json({ message: "Server error" });
    }
}

export const handleGetAvailableItemsForStudent = async (req, res) => {
    const user_id = req.session.user.id;
    try {
        const availableItems = await getAvailableItemsForStudent(user_id);
        return res.status(200).json(availableItems);
    } catch (error) {
        return res.status(500).json({ message: "Server error" });
    }
}

export const handleReturnItem = async (req, res) => {
    const { reservation_id, actual_return_date } = req.body;
    try {
        const reservation = await returnItem(reservation_id, actual_return_date);
        return res.status(200).json(reservation);
    } catch (error) {
        return res.status(500).json({ message: "Server error" });
    }
}
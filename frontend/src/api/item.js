
export const handleGetAvailableItemsForStudent = async () => {
        const response = await fetch('http://localhost:3000/users/me/available-items', {
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include'
        });
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || "Failed to fetch available items");
        }
        return data;
};

export const handleBorrowItem = async (itemUnitId, studentId, timetableId, scannedItemUnitId) => {
        const response = await fetch('http://localhost:3000/users/me/reservations', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({ 
                item_unit_id: itemUnitId, 
                student_id: studentId, 
                timetable_id: timetableId, 
                scanned_item_unit_id: scannedItemUnitId })
        });
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || "Failed to borrow item");
        }
        return data;
};

export const handleReturnItem = async (reservationId, itemUnitId, scannedUnitItemId) => {
        const response = await fetch('http://localhost:3000/users/me/reservations', {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({ id: reservationId, item_unit_id: itemUnitId, scanned_item_unit_id: scannedUnitItemId })
        });
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || "Failed to return item");
        }
        return data;
};

export const handleGetUserReservations = async () => {
        const response = await fetch(`http://localhost:3000/users/me/reservations `, {
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include'
        });
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || "Failed to fetch user history");
        }
        return data;
}

export const handleGetAllReservations = async () => {
        const response = await fetch(`http://localhost:3000/reservations`, {
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include'
        });
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || "Failed to fetch history");
        }
        return data;
}
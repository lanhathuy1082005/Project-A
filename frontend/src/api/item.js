
export const handleGetAvailableItemsForStudent = async () => {
    try {
        const response = await fetch('http://localhost:3000/users/me/available-items', {
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include'
        });
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error fetching available items:', error);
    }
};

export const handleBorrowItem = async (itemUnitId, studentId, timetableId, scannedItemUnitId) => {
    try {
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
        return data;
    } catch (error) {
        console.error('Error borrowing item:', error);
    }
};

export const handleReturnItem = async (reservationId) => {
    try {
        const actualReturnDate = new Date().toISOString().replace("T", " ").split(".")[0];
        const response = await fetch('http://localhost:3000/users/me/reservations', {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({ id: reservationId, actual_return_date: actualReturnDate })
        });
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error returning item:', error);
    }
};

export const handleGetUserHistory = async () => {
    try {
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
    } catch (error) {
        console.error("Error fetching user history:", error);
    }
}

export const handleGetHistory = async () => {
    try {
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
    } catch (error) {
        console.error("Error fetching history:", error);
    }
}
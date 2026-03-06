export const fetchUserHistory = async () => {
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
        throw error;
    }
}
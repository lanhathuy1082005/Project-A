export const handleUserLogin = async (userData) => {

        const response = await fetch('http://localhost:3000/auth/user', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(userData),
            credentials: 'include'
        });
        const data = await response.json();

        if(!response.ok){
            throw new Error(data.message || "Login failed");
        }
        console.log(data);
        return data;
};

export const handleLogout = async () => {

        const response = await fetch('http://localhost:3000/auth/logout', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            }, 
            credentials: 'include'
        });
        const data = await response.json();

        if(!response.ok){
            throw new Error(data.message || "Logout failed");
        }
        console.log(data);
        return data;
};

export const fetchCurrentUser = async (setUser) => {
    try {
        const res = await fetch("http://localhost:3000/auth/me", {
            credentials: "include"
        });
        const data = await res.json(); 
        if (!res.ok) throw new Error(data.message || "Something went wrong");
        setUser(data.user);
        console.log("Current user:", data.user);
    } catch (err) {
        console.log(err.message);
        setUser(null);
    }
};
import "../services/UserServices.js";

export const register = async (req, res) => {
    const { username, email, password } = req.body;
    try {
        await registerUser(username, email, password);
        res.status(201).json({ message: 'User registered successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export const login = async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await loginUser(email, password);
        res.status(200).json({ message: 'Login successful', user });
    } catch (error) {
        res.status(401).json({ error: error.message });
    }
}
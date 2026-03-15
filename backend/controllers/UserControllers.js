import {loginUserService} from "../services/UserServices.js";

export const loginUser = async (req, res) => {
    const { user_id, password } = req.body;
    console.log("Login attempt for user_id:", user_id); // Debugging log
    try {
        const user = await loginUserService(user_id, password);
        console.log("Login service returned:", user); // Debugging log
        if (!user) {
            return res.status(401).json({ message: 'User doesn\'t exist or invalid password' });
        }

        req.session.user = user;
        return res.status(200).json({ message: "Login successful", user: user });
    } catch (error) {
        return res.status(500).json({ message: "Server error" });
    }
}

export const logout = (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ message: "Server error" });
        }
        return res.status(200).json({ message: "Logged out successfully" });
    }); 
}

export const getCurrentUser = (req, res) => {
    if (req.session.user) {
        return res.status(200).json({ user: req.session.user });
    } else {
        return res.status(401).json({ message: "Not authenticated" });
    }
};
import {loginAdminService, loginUserService} from "../services/UserServices.js";


export const loginAdmin = async (req, res) => {
    const { password } = req.body;
    try {
        const user = await loginAdminService(password);
        if (!user) {
            return res.status(401).json({ message: 'Invalid password' });
        }
        
        req.session.user = user;
        return res.status(200).json({ message: "Login successful",user: user });
    } catch (error) {
        return res.status(500).json({message: "Server error" });
    }
}

export const loginUser = async (req, res) => {
    const { student_id, password } = req.body;
    try {
        const user = await loginUserService(student_id, password);
        if (!user) {
            return res.status(401).json({ message: 'User doesn\'t exist or invalid password' });
        }

        req.session.user = user;
        return res.status(200).json({ message: "Login successful",user: user });
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
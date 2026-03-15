import { useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext.jsx";
import { handleLogout } from "../api/login.js";
import {PiHouseFill} from "react-icons/pi";
import {FaUnlockAlt} from "react-icons/fa";
import {NavLink} from "react-router-dom";

export default function Navbar() {
    const {user, setUser} = useContext(AuthContext);
    const navigate = useNavigate();
    const handleLogoutClick = async () => {
        await handleLogout();
        setUser(null);
        navigate("/user-login");
    }
    return (
        <>
            <nav>
                <p>Welcome, {user?.user_id || "Guest"}!</p>
                <NavLink to="/"><PiHouseFill /> Home</NavLink>
                <NavLink to="/history">History</NavLink>
                <NavLink to="/items">Items</NavLink>
                <div className="auth-links">
                {user ? (
                    <NavLink to="/user-login" onClick={handleLogoutClick}><FaUnlockAlt />Logout</NavLink>
                ) : (
                    <NavLink to="/user-login"><FaUnlockAlt /> Login</NavLink>
                )}
                </div>
            </nav>
        </>
    );
}

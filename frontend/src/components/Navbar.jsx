import { useContext, useState } from "react";
import { useNavigate, NavLink } from "react-router-dom";
import { AuthContext } from "../context/AuthContext.jsx";
import { handleLogout } from "../api/login.js";
import { PiHouseFill } from "react-icons/pi";
import { TbBox, TbPackage, TbHistory, TbLogout } from "react-icons/tb";
import { FiUser, FiChevronRight, FiChevronLeft } from "react-icons/fi";
import "./Navbar.css";

export default function Navbar() {
    const { user, setUser } = useContext(AuthContext);
    const navigate = useNavigate();
    const [collapsed, setCollapsed] = useState(false);

    const handleLogoutClick = async () => {
        await handleLogout();
        setUser(null);
        navigate("/user-login");
    };

    return (
        <aside className={`sidebar ${collapsed ? "sidebar--collapsed" : ""}`}>

            {/* Toggle button */}
            <button
                className="sidebar__toggle"
                onClick={() => setCollapsed(!collapsed)}
                aria-label="Toggle sidebar"
            >
                {collapsed
                    ? <FiChevronRight size={16} />
                    : <FiChevronLeft  size={16} />
                }
            </button>

            {/* Header */}
            <div className="sidebar__header">
                <div className="sidebar__logo">
                    <TbBox size={26} />
                </div>
                {!collapsed && (
                    <span className="sidebar__title">
                        Asia Vietnam lab<br />management system
                    </span>
                )}
            </div>

            {/* Navigation */}
            <nav className="sidebar__nav">
                <NavLink to="/" end
                    className={({ isActive }) =>
                        `sidebar__link ${isActive ? "sidebar__link--active" : ""} ${collapsed ? "sidebar__link--icon-only" : ""}`
                    }
                >
                    <PiHouseFill className="sidebar__icon" />
                    {!collapsed && <span>Home</span>}
                </NavLink>

                <NavLink to="/items"
                    className={({ isActive }) =>
                        `sidebar__link ${isActive ? "sidebar__link--active" : ""} ${collapsed ? "sidebar__link--icon-only" : ""}`
                    }
                >
                    <TbPackage className="sidebar__icon" />
                    {!collapsed && <span>Item</span>}
                </NavLink>

                <NavLink to="/history"
                    className={({ isActive }) =>
                        `sidebar__link ${isActive ? "sidebar__link--active" : ""} ${collapsed ? "sidebar__link--icon-only" : ""}`
                    }
                >
                    <TbHistory className="sidebar__icon" />
                    {!collapsed && <span>History</span>}
                </NavLink>
            </nav>

            <div className="sidebar__spacer" />

            {/* Divider */}
            <div className="sidebar__divider" />

            {/* User info */}
            <div className={`sidebar__user ${collapsed ? "sidebar__user--centered" : ""}`}>
                <div className="sidebar__avatar">
                    <FiUser size={22} color="white" />
                </div>
                {!collapsed && (
                    <div className="sidebar__user-info">
                        <span className="sidebar__user-name">{user?.user_id}</span>
                        <span className="sidebar__user-role">
                            {(user?.role ?? "user").toUpperCase()}
                        </span>
                    </div>
                )}
            </div>

            {/* Logout */}
            <div className="sidebar__footer">
                <button className="sidebar__logout" onClick={handleLogoutClick}>
                    <TbLogout size={20} />
                    {!collapsed && <span>Logout</span>}
                </button>
            </div>

        </aside>
    );
}
